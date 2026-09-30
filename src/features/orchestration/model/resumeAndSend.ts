import type { ComposerSubmitResult } from "../../sessions/model/session";

/** Resume a paused run and submit the retained composer turn exactly once. */
export async function resumeAndSend(
  resume: () => Promise<void>,
  submit: () => ComposerSubmitResult,
  onResumeFailure: () => void,
): Promise<boolean> {
  try {
    await resume();
    return (await submit()) !== false;
  } catch {
    onResumeFailure();
    return false;
  }
}
