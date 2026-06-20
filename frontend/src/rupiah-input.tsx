import type { CSSProperties, InputHTMLAttributes } from "react";

type RupiahInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  compact?: boolean;
};

const rupiahNumberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
  useGrouping: true
});

const wrapperBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
  minHeight: 44,
  overflow: "hidden",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "#ffffff"
};

const prefixStyle: CSSProperties = {
  alignSelf: "stretch",
  display: "flex",
  alignItems: "center",
  flex: "0 0 auto",
  borderRight: "1px solid #e8edf1",
  padding: "0 11px 0 13px",
  background: "#f7f9fb",
  color: "var(--muted)",
  fontWeight: 800
};

const inputStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  minHeight: 42,
  border: 0,
  borderRadius: 0,
  outline: 0,
  padding: "0 12px",
  background: "transparent",
  color: "var(--text)",
  fontVariantNumeric: "tabular-nums",
  textAlign: "right"
};

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
  compact = false,
  className = "",
  disabled,
  style,
  ...inputProps
}: RupiahInputProps) {
  const wrapperClass = ["rupiah-input", disabled && "is-disabled", className].filter(Boolean).join(" ");
  const wrapperStyle: CSSProperties = {
    ...wrapperBaseStyle,
    width: compact ? 170 : "100%",
    background: disabled ? "#f3f5f7" : wrapperBaseStyle.background,
    opacity: disabled ? 0.78 : 1
  };

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <span className="rupiah-input__prefix" style={prefixStyle} aria-hidden="true">Rp</span>
      <input
        {...inputProps}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        autoComplete="off"
        value={formatRupiahInput(value)}
        disabled={disabled}
        style={{ ...inputStyle, ...style }}
        onChange={(event) => onValueChange(parseRupiahInput(event.target.value))}
      />
    </div>
  );
}
