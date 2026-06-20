import type { ChangeEvent, InputHTMLAttributes } from "react";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step" | "inputMode" | "pattern"
>;

export type RupiahInputProps = NativeInputProps & {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function formatRupiahInput(value: number): string {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return normalized.toLocaleString("id-ID");
}

export function parseRupiahInput(rawValue: string): number {
  const digits = rawValue.replace(/\D/g, "");
  if (!digits) return 0;

  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function RupiahInput({
  value,
  onValueChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  className = "",
  disabled,
  ...inputProps
}: RupiahInputProps) {
  const invalid = inputProps["aria-invalid"] === true || inputProps["aria-invalid"] === "true";
  const wrapperClass = [
    "rupiah-input",
    invalid && "rupiah-input--invalid",
    disabled && "rupiah-input--disabled",
    className
  ].filter(Boolean).join(" ");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseRupiahInput(event.target.value);
    onValueChange(Math.min(max, Math.max(min, parsed)));
  };

  return (
    <span className={wrapperClass}>
      <span className="rupiah-input__prefix" aria-hidden="true">Rp</span>
      <input
        {...inputProps}
        className="rupiah-input__field"
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        value={formatRupiahInput(value)}
        disabled={disabled}
        onChange={handleChange}
      />
    </span>
  );
}
