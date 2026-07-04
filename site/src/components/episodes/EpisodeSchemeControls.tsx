import type { EpisodeScheme } from "./schemes/types";
import { Switch } from "../Switch";

type EpisodeSchemeControlsProps = {
  schemes: EpisodeScheme[];
  schemeId: string;
  groupEnabled: boolean;
  onSchemeChange: (schemeId: string) => void;
  onGroupChange: (enabled: boolean) => void;
};

const GROUP_SWITCH_ID = "episodes-group-switch";

export function EpisodeSchemeControls({
  schemes,
  schemeId,
  groupEnabled,
  onSchemeChange,
  onGroupChange,
}: EpisodeSchemeControlsProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <span className="text-xs font-medium text-text-muted">Color scheme</span>
        <div
          aria-label="Color scheme"
          className="flex flex-wrap gap-0.5 rounded-lg border border-border bg-surface-elevated p-0.5"
          role="group"
        >
          {schemes.map((scheme) => {
            const isActive = scheme.id === schemeId;
            return (
              <button
                key={scheme.id}
                type="button"
                aria-pressed={isActive}
                className={[
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-surface text-text shadow-sm"
                    : "text-text-muted hover:text-text",
                ].join(" ")}
                onClick={() => {
                  if (!isActive) {
                    onSchemeChange(scheme.id);
                  }
                }}
              >
                {scheme.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor={GROUP_SWITCH_ID}
          className="text-xs font-medium text-text-muted"
        >
          Group
        </label>
        <div className="flex h-[34px] items-center">
          <Switch
            id={GROUP_SWITCH_ID}
            checked={groupEnabled}
            onCheckedChange={onGroupChange}
          />
        </div>
      </div>
    </div>
  );
}
