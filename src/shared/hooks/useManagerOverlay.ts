import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

/** Feature-owned surfaces share activation, focus and keyboard isolation. */
export function useManagerOverlay(
  openEvent: string,
  otherEvent: string,
  navigationKey: string,
  escapeCloses = true,
): {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  root: RefObject<HTMLDivElement | null>;
} {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = (): void => setOpen(true);
    const hide = (): void => setOpen(false);
    window.addEventListener(openEvent, show);
    window.addEventListener(otherEvent, hide);
    return () => {
      window.removeEventListener(openEvent, show);
      window.removeEventListener(otherEvent, hide);
    };
  }, [openEvent, otherEvent]);
  useEffect(() => setOpen(false), [navigationKey]);
  useEffect(() => {
    const element = root.current;
    if (!open || !element) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const siblings = [...(element.parentElement?.children ?? [])]
      .filter(
        (sibling): sibling is HTMLElement =>
          sibling instanceof HTMLElement && sibling !== element,
      )
      .map((sibling) => ({ sibling, inert: sibling.inert }));
    for (const { sibling } of siblings) sibling.inert = true;
    element.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent): void => {
      if (
        !escapeCloses ||
        event.key !== "Escape" ||
        event.defaultPrevented ||
        document.querySelector(
          '[role="dialog"], [role="menu"], [role="listbox"]',
        )
      )
        return;
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      for (const { sibling, inert } of siblings) sibling.inert = inert;
      if (
        previous?.isConnected &&
        (document.activeElement === document.body ||
          element.contains(document.activeElement))
      )
        previous.focus({ preventScroll: true });
    };
  }, [open, escapeCloses]);
  return { open, setOpen, root };
}
