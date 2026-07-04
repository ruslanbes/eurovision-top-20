import * as SwitchPrimitive from "@radix-ui/react-switch";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled = false,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={[
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border",
        "bg-surface-elevated transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent",
      ].join(" ")}
    >
      <SwitchPrimitive.Thumb
        className={[
          "block h-5 w-5 translate-x-0.5 rounded-full bg-surface shadow-sm",
          "transition-transform will-change-transform data-[state=checked]:translate-x-[1.375rem]",
        ].join(" ")}
      />
    </SwitchPrimitive.Root>
  );
}
