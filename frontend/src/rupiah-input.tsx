import type { InputHTMLAttributes } from "react";

type RupiahInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
};

const rupiahNumberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
  useGrouping: true
});

export function formatRupiahInput(value: number) {
  const normalized = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  return rupiahNumberFormatter.format(normalized);
}

export function parseRupiahInput(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return 0;

  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function RupiahInput({
  value,
  onValueChange,
  className = "",
  disabled,
  ...inputProps
}: RupiahInputProps) {
  const wrapperClass = ["rupiah-input", disabled && "is-disabled", className].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      <span className="rupiah-input__prefix" aria-hidden="true">Rp</span>
      <input
        {...inputProps}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        autoComplete="off"
        value={formatRupiahInput(value)}
        disabled={disabled}
        onChange={(event) => onValueChange(parseRupiahInput(event.target.value))}
      />
    </div>
  );
}
