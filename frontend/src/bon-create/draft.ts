import type { AcceptanceBonLine } from "../acceptance-data";
import { normalizeBonNumber } from "../bon-number";
import type { StoredBon } from "../store";
import type { Mode, StoredDraft } from "./types";

const DRAFT_KEY = "hl-bon-draft-v1";
const DRAFT_MAX_AGE = 24 * 60 * 60 * 1000;

export function writeDraft(draft: StoredDraft) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readDraft(): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDraft>;
    if (parsed.version !== 1 || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > DRAFT_MAX_AGE) {
      clearDraft();
      return null;
    }
    if ((parsed.mode !== "normal" && parsed.mode !== "bonus") || typeof parsed.date !== "string" || typeof parsed.number !== "string" || typeof parsed.customerCode !== "string" || typeof parsed.description !== "string" || typeof parsed.shipping !== "number" || !Array.isArray(parsed.lines)) {
      clearDraft();
      return null;
    }
    const lines = parsed.lines.filter((line): line is AcceptanceBonLine => Boolean(line) && typeof line.productId === "string" && Number.isSafeInteger(line.quantity) && line.quantity >= 1);
    return { ...parsed, lines } as StoredDraft;
  } catch {
    clearDraft();
    return null;
  }
}

export function clearDraft() {
  window.localStorage.removeItem(DRAFT_KEY);
}

export function nextBonNumber(mode: Mode, date: string, bons: StoredBon[]) {
  const prefix = mode === "bonus" ? "BONUS" : "BON";
  const compactDate = date.replaceAll("-", "");
  const start = `${prefix}-${compactDate}-`;
  const numbers = bons
    .map((bon) => normalizeBonNumber(bon.number))
    .filter((bonNumber) => bonNumber.startsWith(start))
    .map((bonNumber) => Number(bonNumber.slice(start.length)))
    .filter((value) => Number.isSafeInteger(value) && value >= 0);
  return `${start}${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
}

export function normalizeFieldErrors(fields: Record<string, unknown>) {
  const result: Record<string, string> = {};
  Object.entries(fields).forEach(([key, value]) => {
    const message = fieldMessage(value);
    if (message) result[key] = message;
  });
  return result;
}

function fieldMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(fieldMessage).find(Boolean);
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    return Object.values(record).map(fieldMessage).find(Boolean);
  }
  return undefined;
}

export const roundHundred = (value: number) => Math.floor((value + 50) / 100) * 100;
