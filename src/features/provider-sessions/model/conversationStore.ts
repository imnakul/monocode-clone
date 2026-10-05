import type {
  NativeProvider,
  ProviderConversation,
  ProviderConversationPage,
} from "./providerSessions";

export type ProviderListState = {
  /** `loading` only before the first result; later refreshes keep `ready` rows. */
  status: "idle" | "loading" | "ready" | "error";
  rows: ProviderConversation[];
  diagnostics: string[];
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  /** A quiet refresh is in flight; rows stay on screen. */
  refreshing: boolean;
};

export type ProviderListSnapshot = Record<NativeProvider, ProviderListState>;

export type ProviderListRequest = {
  accountId: string;
  includeArchived: boolean;
  limit: number;
  offset: number;
};

export type ProviderConversationStoreDeps = {
  list: (
    provider: NativeProvider,
    options: ProviderListRequest,
  ) => Promise<ProviderConversationPage>;
  /** Account ids configured for a provider (the default account always first). */
  accounts: (provider: NativeProvider) => readonly string[];
  /** Human label for diagnostics about one account. */
  accountLabel?: (provider: NativeProvider, accountId: string) => string;
};

export const PROVIDER_PAGE_SIZE = 10;
const PAGE_SIZE = PROVIDER_PAGE_SIZE;
const PROVIDERS: readonly NativeProvider[] = ["claude", "codex"];

export const emptyProviderListState: ProviderListState = {
  status: "idle",
  rows: [],
  diagnostics: [],
  error: null,
  hasMore: false,
  loadingMore: false,
  refreshing: false,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Merge pages by native key (newest wins on a tie) and sort newest first. */
export function mergeConversationRows(
  ...groups: readonly (readonly ProviderConversation[])[]
): ProviderConversation[] {
  const byKey = new Map<string, ProviderConversation>();
  for (const group of groups)
    for (const row of group) {
      const current = byKey.get(row.key);
      if (!current || row.updatedAt >= current.updatedAt)
        byKey.set(row.key, row);
    }
  return [...byKey.values()].sort(
    (left, right) =>
      right.updatedAt - left.updatedAt || left.key.localeCompare(right.key),
  );
}

type SourceCursors = Map<string, number | null>;

/**
 * Framework-free list state for discovered provider conversations. Every
 * refresh/page request carries a generation; a response from an older
 * generation (provider disabled, archived filter changed, newer refresh) is
 * dropped so it can never overwrite the list the user is looking at.
 */
export class ProviderConversationStore {
  private listeners = new Set<() => void>();
  private snapshot: ProviderListSnapshot = {
    claude: emptyProviderListState,
    codex: emptyProviderListState,
  };
  private generation: Record<NativeProvider, number> = { claude: 0, codex: 0 };
  private cursors: Record<NativeProvider, SourceCursors> = {
    claude: new Map(),
    codex: new Map(),
  };
  private loadedRows: Record<NativeProvider, ProviderConversation[]> = { claude: [], codex: [] };
  private visibleLimit: Record<NativeProvider, number> = { claude: PAGE_SIZE, codex: PAGE_SIZE };
  private enabled = new Set<NativeProvider>();
  private includeArchived = false;

  constructor(private readonly deps: ProviderConversationStoreDeps) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ProviderListSnapshot => this.snapshot;

  private emit(provider: NativeProvider, next: ProviderListState): void {
    this.snapshot = { ...this.snapshot, [provider]: next };
    for (const listener of [...this.listeners]) listener();
  }

  private patch(
    provider: NativeProvider,
    change: Partial<ProviderListState>,
  ): void {
    this.emit(provider, { ...this.snapshot[provider], ...change });
  }

  /** Enabling loads; disabling invalidates in-flight work and clears rows. */
  setProviders(providers: readonly NativeProvider[]): void {
    const next = new Set(providers);
    for (const provider of PROVIDERS) {
      const was = this.enabled.has(provider);
      const now = next.has(provider);
      if (was && !now) {
        this.generation[provider] += 1;
        this.cursors[provider] = new Map();
        this.loadedRows[provider] = [];
        this.visibleLimit[provider] = PAGE_SIZE;
        this.emit(provider, emptyProviderListState);
      }
    }
    const added = PROVIDERS.filter(
      (provider) => next.has(provider) && !this.enabled.has(provider),
    );
    this.enabled = next;
    for (const provider of added) void this.refresh(provider);
  }

  setIncludeArchived(value: boolean): void {
    if (this.includeArchived === value) return;
    this.includeArchived = value;
    for (const provider of this.enabled) {
      this.visibleLimit[provider] = PAGE_SIZE;
      void this.refresh(provider, { quiet: true });
    }
  }

  getIncludeArchived(): boolean {
    return this.includeArchived;
  }

  refreshAll(options: { quiet?: boolean } = {}): void {
    for (const provider of this.enabled) void this.refresh(provider, options);
  }

  async refresh(
    provider: NativeProvider,
    options: { quiet?: boolean } = {},
  ): Promise<void> {
    if (!this.enabled.has(provider)) return;
    const generation = ++this.generation[provider];
    const current = this.snapshot[provider];
    const quiet = options.quiet ?? current.status === "ready";
    this.patch(provider, {
      status: current.status === "ready" ? "ready" : "loading",
      refreshing: current.status === "ready",
      loadingMore: false,
      ...(quiet ? {} : { error: null }),
    });
    const accounts = this.accountIds(provider);
    const includeArchived = this.includeArchived;
    const results = await Promise.allSettled(
      accounts.map((accountId) =>
        this.listExpandedPage(provider, {
          accountId,
          includeArchived,
          limit: this.visibleLimit[provider],
          offset: 0,
        }),
      ),
    );
    if (generation !== this.generation[provider]) return;
    const cursors: SourceCursors = new Map();
    const rows: ProviderConversation[][] = [];
    const diagnostics: string[] = [];
    const failures: string[] = [];
    results.forEach((result, index) => {
      const accountId = accounts[index];
      if (result.status === "fulfilled") {
        rows.push(result.value.conversations);
        diagnostics.push(...result.value.diagnostics);
        cursors.set(accountId, result.value.nextOffset);
      } else {
        const label = this.deps.accountLabel?.(provider, accountId);
        failures.push(
          `${label && accounts.length > 1 ? `${label}: ` : ""}${errorMessage(result.reason)}`,
        );
        cursors.set(accountId, null);
      }
    });
    const allFailed = failures.length === accounts.length;
    if (allFailed) {
      // Keep whatever was already shown; the error sits above it.
      this.patch(provider, {
        status: current.status === "ready" ? "ready" : "error",
        error: failures.join("\n"),
        refreshing: false,
      });
      return;
    }
    this.cursors[provider] = cursors;
    this.loadedRows[provider] = mergeConversationRows(...rows);
    this.emit(provider, {
      status: "ready",
      rows: this.loadedRows[provider].slice(0, this.visibleLimit[provider]),
      diagnostics: [...new Set([...diagnostics, ...failures])],
      error: null,
      hasMore: this.loadedRows[provider].length > this.visibleLimit[provider] || [...cursors.values()].some((offset) => offset !== null),
      loadingMore: false,
      refreshing: false,
    });
  }

  async loadMore(provider: NativeProvider): Promise<void> {
    const state = this.snapshot[provider];
    if (!this.enabled.has(provider) || state.refreshing || state.loadingMore || !state.hasMore)
      return;
    const generation = this.generation[provider];
    const targetLimit = this.visibleLimit[provider] + PAGE_SIZE;
    const pending = [...this.cursors[provider]].filter(
      (entry): entry is [string, number] => entry[1] !== null && entry[1] < targetLimit,
    );
    this.patch(provider, { loadingMore: true });
    const includeArchived = this.includeArchived;
    const results = await Promise.allSettled(
      pending.map(([accountId, offset]) =>
        this.deps.list(provider, {
          accountId,
          includeArchived,
          limit: PAGE_SIZE,
          offset,
        }),
      ),
    );
    if (generation !== this.generation[provider]) return;
    const cursors = new Map(this.cursors[provider]);
    const pages: ProviderConversation[][] = [];
    const diagnostics: string[] = [];
    let failure: string | null = null;
    results.forEach((result, index) => {
      const accountId = pending[index][0];
      if (result.status === "fulfilled") {
        pages.push(result.value.conversations);
        diagnostics.push(...result.value.diagnostics);
        cursors.set(accountId, result.value.nextOffset);
      } else {
        // Leave the cursor so the same page can be retried.
        failure = errorMessage(result.reason);
      }
    });
    this.cursors[provider] = cursors;
    const latest = this.snapshot[provider];
    if (!failure) this.visibleLimit[provider] = targetLimit;
    this.loadedRows[provider] = mergeConversationRows(this.loadedRows[provider], ...pages);
    this.emit(provider, {
      ...latest,
      rows: this.loadedRows[provider].slice(0, this.visibleLimit[provider]),
      diagnostics: [...new Set([...latest.diagnostics, ...diagnostics])],
      error: failure,
      hasMore: this.loadedRows[provider].length > this.visibleLimit[provider] || [...cursors.values()].some((offset) => offset !== null),
      loadingMore: false,
    });
  }

  /** Optimistically reflect an archive flag; returns the previous row for rollback. */
  setArchivedLocal(
    key: string,
    archived: boolean,
  ): { provider: NativeProvider; row: ProviderConversation } | null {
    for (const provider of PROVIDERS) {
      const state = this.snapshot[provider];
      const row = state.rows.find((entry) => entry.key === key);
      if (!row) continue;
      this.loadedRows[provider] = archived && !this.includeArchived
        ? this.loadedRows[provider].filter((entry) => entry.key !== key)
        : this.loadedRows[provider].map((entry) => entry.key === key ? { ...entry, archived } : entry);
      this.patch(provider, {
        rows: this.loadedRows[provider].slice(0, this.visibleLimit[provider]),
        hasMore: this.loadedRows[provider].length > this.visibleLimit[provider] || [...this.cursors[provider].values()].some((offset) => offset !== null),
      });
      return { provider, row };
    }
    return null;
  }

  /** Put a row back exactly as it was (rollback after a failed archive write). */
  restoreRow(provider: NativeProvider, row: ProviderConversation): void {
    this.loadedRows[provider] = mergeConversationRows(this.loadedRows[provider].filter((entry) => entry.key !== row.key), [row]);
    this.patch(provider, {
      rows: this.loadedRows[provider].slice(0, this.visibleLimit[provider]),
      hasMore: this.loadedRows[provider].length > this.visibleLimit[provider] || [...this.cursors[provider].values()].some((offset) => offset !== null),
    });
  }

  /** Mark a row as backed by a MonoCode chat (after open) without a refetch. */
  linkSession(key: string, sessionId: string): void {
    for (const provider of PROVIDERS) {
      const state = this.snapshot[provider];
      if (!state.rows.some((row) => row.key === key)) continue;
      this.loadedRows[provider] = this.loadedRows[provider].map((row) => row.key === key ? { ...row, monocodeSessionId: sessionId } : row);
      this.patch(provider, {
        rows: state.rows.map((row) =>
          row.key === key ? { ...row, monocodeSessionId: sessionId } : row,
        ),
      });
    }
  }

  /** Refresh all expanded rows even beyond the backend's 500-row page cap. */
  private async listExpandedPage(
    provider: NativeProvider,
    request: ProviderListRequest,
  ): Promise<ProviderConversationPage> {
    const conversations: ProviderConversation[] = [];
    const diagnostics: string[] = [];
    let offset = request.offset;
    while (true) {
      const page = await this.deps.list(provider, { ...request, offset, limit: Math.min(500, request.limit - offset) });
      conversations.push(...page.conversations);
      diagnostics.push(...page.diagnostics);
      if (request.limit <= 500 || page.nextOffset === null || page.nextOffset >= request.limit)
        return { conversations, diagnostics, nextOffset: page.nextOffset };
      if (page.nextOffset <= offset) throw new Error("Provider conversation paging did not advance");
      offset = page.nextOffset;
    }
  }

  private accountIds(provider: NativeProvider): string[] {
    const ids = [...new Set(this.deps.accounts(provider))];
    return ids.length > 0 ? ids : ["default"];
  }
}
