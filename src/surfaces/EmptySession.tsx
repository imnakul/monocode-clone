import { type ReactNode, useSyncExternalStore } from "react";
import { MessageSquarePlus } from "../chrome/icons";
import { basename } from "../lib/fs";
import { looksLikeProject } from "../lib/recents";
import {
  loadGridArcadeEnabled,
  subscribeGridArcadeEnabled,
} from "../lib/settings";
import { useLockOverscroll } from "../hooks/useLockOverscroll";
import { TerminalGridBackground } from "./TerminalGridBackground";

type Props = {
  cwd: string;
  composer?: ReactNode;
  /** Temporary chats (sidechat) show this instead of the work prompt. */
  notice?: { title: string; body: string };
};

export function EmptySession({ cwd, composer, notice }: Props) {
  const lockOverscroll = useLockOverscroll<HTMLDivElement>();
  const arcadeEnabled = useSyncExternalStore(
    subscribeGridArcadeEnabled,
    loadGridArcadeEnabled,
    () => true,
  );
  const project = looksLikeProject(cwd) ? basename(cwd) : null;
  const title = project
    ? `What should we work on in ${project}?`
    : "What should we work on?";

  return (
    <div
      ref={lockOverscroll}
      className="relative flex h-full min-h-0 overflow-y-auto overscroll-none"
    >
      {arcadeEnabled ? <TerminalGridBackground /> : null}
      {composer ? (
        <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
          <div className="pointer-events-auto mb-4 px-2.5">
            {notice ? (
              <div className="flex flex-col items-center gap-2 text-center">
                <MessageSquarePlus
                  className="size-5 text-content/40"
                  strokeWidth={1.5}
                />
                <h1 className="text-lg text-content">{notice.title}</h1>
                <p className="max-w-md text-[13px] leading-relaxed text-content/50">
                  {notice.body}
                </p>
              </div>
            ) : (
              <h1
                className="truncate text-lg text-content"
                title={project ? cwd : undefined}
              >
                {title}
              </h1>
            )}
          </div>

          <div className="pointer-events-auto w-full">{composer}</div>
        </div>
      ) : null}
    </div>
  );
}
