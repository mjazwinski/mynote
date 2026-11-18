import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  title: string;
  role?: "dialog" | "alertdialog";
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
}

function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Keep Tab / Shift+Tab inside the dialog. */
function trapTab(event: KeyboardEvent, container: HTMLElement) {
  const items = focusables(container);
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function Modal({ title, role = "dialog", onClose, initialFocusRef, children, footer }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target = initialFocusRef?.current ?? (panel ? focusables(panel)[0] : null) ?? panel;
    target?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab" && panelRef.current) {
        trapTab(event, panelRef.current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 text-fg shadow-xl"
      >
        <h2 id={titleId} className="mb-3 text-lg font-semibold">
          {title}
        </h2>
        <div className="space-y-3">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
