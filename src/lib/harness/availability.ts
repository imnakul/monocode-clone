import type { HarnessId } from "../session";
import { HARNESSES } from "../session";
import { probeHarnessBinary } from "./child";
import { isLiveHarness } from "./registry";

export type HarnessAvailability = Record<HarnessId, boolean>;

/**
 * We only ever check whether the binary exists, never whether it is
 * authenticated, so the hint must not blame a login.
 */
const CLI: Record<HarnessId, { name: string; install?: string }> = {
  claude: { name: "Claude Code CLI" },
  codex: { name: "Codex CLI" },
  cursor: { name: "Cursor CLI" },
  grok: {
    name: "Grok Build CLI",
    install: "curl -fsSL https://x.ai/cli/install.sh | bash",
  },
  opencode: { name: "OpenCode CLI" },
  pi: { name: "Pi CLI", install: "npm i -g @earendil-works/pi-coding-agent" },
  omp: { name: "omp CLI", install: "curl -fsSL https://omp.sh/install | sh" },
  fx: { name: "fx CLI", install: "curl -fsSL https://fx.sh/setup.sh | bash" },
  antigravity: {
    name: "Antigravity ACP runtime",
  },
  cline: {
    name: "Cline CLI",
    install: "npm i -g cline",
  },
};

let availability: HarnessAvailability = {
  claude: false,
  codex: false,
  cursor: false,
  grok: false,
  opencode: false,
  pi: false,
  omp: false,
  fx: false,
  antigravity: false,
  cline: false,
};
let version = 0;
let inflight: Promise<void> | null = null;
let probedAt = 0;
/** Harnesses with backend-authoritative evidence (a probe or catalog run). */
const evidenced = new Set<HarnessId>();
let antigravityProbeError: string | null = null;
const listeners = new Set<() => void>();

/**
 * A probe stats ~100 paths across eight resolvers. The model picker and the
 * providers pane both probe on open, so without a TTL every open pays for it
 * again to learn what it already knows. Installing a CLI mid-session is rare,
 * and `force` covers it.
 */
const PROBE_TTL_MS = 30_000;

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeHarnessAvailability(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHarnessAvailabilitySnapshot(): number {
  return version;
}

export function hasProbedHarnessAvailability(): boolean {
  return probedAt > 0;
}

/**
 * True once this harness has backend-authoritative evidence in this session
 * (a completed probe, or catalog discovery that proved the runtime answers).
 * Before that the UI must render "not checked yet" — never "not installed".
 */
export function hasHarnessEvidence(id: HarnessId): boolean {
  return evidenced.has(id);
}

export function isHarnessAvailable(id: HarnessId): boolean {
  return availability[id];
}

/**
 * Record availability evidence without running a probe. Used when catalog
 * discovery already proved the runtime answers, so the expensive Antigravity
 * ACP handshake and the shared-runtime acquisition never run side by side.
 */
export function noteHarnessEvidence(
  id: HarnessId,
  ok: boolean,
  error?: string,
): void {
  availability = { ...availability, [id]: ok };
  evidenced.add(id);
  if (id === "antigravity") {
    antigravityProbeError = ok ? null : (error ?? antigravityProbeError);
  }
  emit();
}

export function harnessUnavailableHint(id: HarnessId): string {
  if (id === "antigravity") {
    return antigravityProbeError ?? "Antigravity ACP runtime not found. Download the official ACP executable and matching helper, then choose the ACP binary in Providers.";
  }
  const { name, install } = CLI[id];
  const how = install ? ` (\`${install}\`)` : "";
  return `${name} not found${how}. Install it, or restart MonoCode if it is already installed.`;
}

/** Test seam. */
export function resetHarnessAvailability(): void {
  availability = {
    claude: false,
    codex: false,
    cursor: false,
    grok: false,
    opencode: false,
    pi: false,
    omp: false,
    fx: false,
    antigravity: false,
    cline: false,
  };
  evidenced.clear();
  antigravityProbeError = null;
  probedAt = 0;
  emit();
}

export function probeHarnessAvailability(
  options?: { force?: boolean; exclude?: HarnessId[] },
): Promise<void> {
  if (inflight) return inflight;
  if (!options?.force && probedAt > 0 && Date.now() - probedAt < PROBE_TTL_MS) {
    return Promise.resolve();
  }
  // Excluded harnesses keep their current status: the Antigravity ACP probe
  // is a ~30 s PyInstaller handshake, so blanket probes (picker open,
  // Providers page) skip it — catalog discovery on the shared runtime
  // reports its evidence via noteHarnessEvidence instead.
  const excluded = new Set(options?.exclude ?? []);
  inflight = Promise.all(
    HARNESSES.map(async (id) => {
      if (excluded.has(id)) return null;
      if (!isLiveHarness(id)) return [id, false] as const;
      try {
        await probeHarnessBinary(id);
        if (id === "antigravity") antigravityProbeError = null;
        return [id, true] as const;
      } catch (error: unknown) {
        if (id === "antigravity") {
          antigravityProbeError = error instanceof Error ? error.message : String(error);
        }
        return [id, false] as const;
      }
    }),
  )
    .then((entries) => {
      const next = { ...availability };
      for (const entry of entries) {
        if (!entry) continue;
        const [id, ok] = entry;
        next[id] = ok;
        evidenced.add(id);
      }
      availability = next;
      emit();
    })
    .finally(() => {
      probedAt = Date.now();
      inflight = null;
    });
  return inflight;
}
