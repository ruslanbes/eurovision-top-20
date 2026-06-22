import { useEffect, useId, useRef, useState } from "react";
import { HELP_CONTENT, type HelpContentId } from "./helpContent";

type HelpPopoverProps = {
  contentId: HelpContentId;
};

export function HelpPopover({ contentId }: HelpPopoverProps) {
  const content = HELP_CONTENT[contentId];
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? titleId : undefined}
        aria-label={content.triggerLabel}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-text-muted hover:bg-surface-elevated hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open ? (
        <div
          id={titleId}
          role="dialog"
          aria-modal="false"
          className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-border bg-surface p-3 text-sm text-text shadow-lg"
        >
          <p className="font-semibold">{content.title}</p>
          <p className="mt-2 text-text-muted">{content.intro}</p>
          <p className="mt-2">
            <span className="font-medium text-text">Formula:</span>{" "}
            <code className="text-text">{content.formula}</code>
          </p>
          <p className="mt-2 text-text-muted">{content.interpretation}</p>
          <a
            href={content.faqUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-accent hover:underline"
          >
            More details
          </a>
        </div>
      ) : null}
    </div>
  );
}
