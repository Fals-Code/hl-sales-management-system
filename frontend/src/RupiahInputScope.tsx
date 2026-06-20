import { useLayoutEffect, useRef, type FormEvent, type ReactNode } from "react";

const moneyPattern = /(harga|ongkir|threshold bonus|rupiah|biaya)/i;
const formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

function setInputValue(input: HTMLInputElement, value: string) {
  if (nativeSetter) nativeSetter.call(input, value);
  else input.value = value;
}

function onlyDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function formatValue(value: string) {
  return formatter.format(Number(onlyDigits(value) || 0));
}

function markMoneyInput(input: HTMLInputElement) {
  if (input.closest(".rupiah-input")) return;
  const label = input.closest("label");
  const text = `${label?.textContent ?? ""} ${input.getAttribute("aria-label") ?? ""}`;
  if (!moneyPattern.test(text)) return;
  input.dataset.rupiahPlain = "true";
  input.type = "text";
  input.inputMode = "numeric";
  label?.classList.add("field--rupiah-plain");
  if (document.activeElement !== input) setInputValue(input, formatValue(input.value));
}

function syncMoneyInputs(root: HTMLElement) {
  root.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
    markMoneyInput(input);
    if (input.dataset.rupiahPlain !== "true") return;
    input.type = "text";
    input.inputMode = "numeric";
    if (document.activeElement !== input) setInputValue(input, formatValue(input.value));
  });
}

export function RupiahInputScope({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const current = root.current;
    if (!current) return;
    const sync = () => syncMoneyInputs(current);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(current, { childList: true, subtree: true });
    const interval = window.setInterval(sync, 150);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  const normalize = (event: FormEvent<HTMLDivElement>) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    markMoneyInput(input);
    if (input.dataset.rupiahPlain !== "true") return;
    setInputValue(input, onlyDigits(input.value));
    queueMicrotask(() => {
      if (!input.isConnected) return;
      input.type = "text";
      input.inputMode = "numeric";
      setInputValue(input, formatValue(input.value));
    });
  };

  return <div ref={root} className="rupiah-input-scope" onInputCapture={normalize}>{children}</div>;
}
