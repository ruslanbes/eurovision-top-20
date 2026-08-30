import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { ExplainerBody, ExplainerFaqLink, EXPLAINER_TITLE } from "./ExplainerBody";

type ExplainerDialogProps = {
  onClose: () => void;
};

export function ExplainerDialog({ onClose }: ExplainerDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close about these stats"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-surface shadow-xl sm:rounded-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-text">
            {EXPLAINER_TITLE}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-text-muted hover:bg-surface-elevated hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">
          <ExplainerBody />
          <p className="mt-4 text-sm text-text-muted">
            More detail: <ExplainerFaqLink />
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
