import { useCallback, useRef, useState } from "react";
import { Modal } from "../../../shared/ui/Modal";
import { QuickComposer } from "../../quick-composer/ui/QuickComposer";
import type { QuickLaunch } from "../../quick-composer/model/quickComposer";

const onShown = () => {};
/** The same composer, with a save destination instead of a floating-panel launch. */
export function SessionTodoComposer({
  initialLaunch,
  editing,
  onSave,
  onClose,
}: {
  initialLaunch: QuickLaunch;
  editing?: boolean;
  onSave: (launch: QuickLaunch) => Promise<void>;
  onClose: () => void;
}) {
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => {
    if (!saving.current) onClose();
  }, [onClose]);
  const submit = async (launch: QuickLaunch) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      await onSave(launch);
      onClose();
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      title={editing ? "Edit Session Manager Todo" : "Add to Session Manager"}
      onClose={close}
      fitViewport
    >
      <p className="px-4 py-2 text-xs text-content/50">
        Save a prepared session. It starts when you choose Start in Session
        Manager.
      </p>
      <div className="p-3" aria-busy={busy}>
        <QuickComposer
          onShown={onShown}
          initialLaunch={initialLaunch}
          onSubmitLaunch={submit}
          onDismiss={close}
          submitLabel={editing ? "Save changes" : "Save Todo"}
        />
      </div>
    </Modal>
  );
}
