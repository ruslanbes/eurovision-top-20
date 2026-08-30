import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ExplainerBody, EXPLAINER_TITLE } from "./ExplainerBody";
import { ExplainerDialog } from "./ExplainerDialog";
import {
  isExplainerDismissed,
  setExplainerDismissed,
} from "./explainerStorage";

const BANNER_SLOT_ID = "site-stats-explainer-banner-slot";

function ExplainerBanner({ onDismiss, onOpenSheet }: {
  onDismiss: () => void;
  onOpenSheet: () => void;
}) {
  return (
    <aside
      data-explainer-banner
      className="rounded-lg border border-border bg-surface-elevated/60 px-4 py-3"
      aria-label={EXPLAINER_TITLE}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text">{EXPLAINER_TITLE}</p>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-0.5 text-sm text-text-muted hover:bg-surface hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label="Dismiss about these stats"
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>
      <div className="mt-2">
        <ExplainerBody />
      </div>
      <p className="mt-3 text-xs text-text-muted">
        You can open this again anytime from the{" "}
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={onOpenSheet}
        >
          info
        </button>{" "}
        button in the header.
      </p>
    </aside>
  );
}

/**
 * Header info control + dismissible intro banner (ported under nav) + sheet.
 * Mount once in the header controls row.
 */
export function SiteStatsExplainer() {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bannerSlot, setBannerSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const dismissedNow = isExplainerDismissed();
    setDismissed(dismissedNow);
    const slot = document.getElementById(BANNER_SLOT_ID);
    if (slot) {
      // Drop SSR markup; interactive banner (or nothing) takes over.
      slot.replaceChildren();
      setBannerSlot(slot);
    }
    setReady(true);
  }, []);

  const dismissBanner = useCallback(() => {
    setExplainerDismissed();
    setDismissed(true);
  }, []);

  const openSheet = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-elevated hover:text-text focus:outline-none focus:ring-2 focus:ring-accent"
        aria-label={EXPLAINER_TITLE}
        title={EXPLAINER_TITLE}
        onClick={openSheet}
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-semibold leading-none"
        >
          i
        </span>
      </button>

      {sheetOpen ? <ExplainerDialog onClose={closeSheet} /> : null}

      {ready && !dismissed && bannerSlot
        ? createPortal(
            <ExplainerBanner onDismiss={dismissBanner} onOpenSheet={openSheet} />,
            bannerSlot,
          )
        : null}
    </>
  );
}
