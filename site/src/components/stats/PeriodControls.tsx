import * as Slider from "@radix-ui/react-slider";
import { formatPeriodLabel } from "./sort";

type PeriodControlsProps = {
  periods: string[];
  period: string;
  onPeriodChange: (period: string) => void;
  disabled?: boolean;
};

export function PeriodControls({
  periods,
  period,
  onPeriodChange,
  disabled = false,
}: PeriodControlsProps) {
  const index = Math.max(0, periods.indexOf(period));
  const sliderValue = periods.length > 1 ? [index] : [0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Episode month:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatPeriodLabel(period)}
          </span>
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {index + 1} / {periods.length}
        </p>
      </div>

      <Slider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
        min={0}
        max={Math.max(0, periods.length - 1)}
        step={1}
        value={sliderValue}
        disabled={disabled || periods.length <= 1}
        onValueChange={(value) => {
          const next = periods[value[0]];
          if (next) {
            onPeriodChange(next);
          }
        }}
        aria-label="Episode month"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-zinc-200 dark:bg-zinc-800">
          <Slider.Range className="absolute h-full rounded-full bg-blue-600 dark:bg-blue-500" />
        </Slider.Track>
        <Slider.Thumb
          className="block h-4 w-4 rounded-full border border-blue-600 bg-white shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-blue-400 dark:bg-zinc-950"
          aria-label="Select episode month"
        />
      </Slider.Root>
    </div>
  );
}
