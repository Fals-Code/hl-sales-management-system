import type { PageKey } from "./data";

const pageKeys: PageKey[] = ["dashboard", "customers", "products", "bons", "receivables", "settlements", "bonus", "reports", "settings"];

export function readHashRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "bon" && parts[1]) {
    return { page: "bons" as PageKey, bonNumber: decodeURIComponent(parts.slice(1).join("/")) };
  }
  const page = pageKeys.includes(parts[0] as PageKey) ? parts[0] as PageKey : "dashboard";
  return { page, bonNumber: null as string | null };
}

export function navigateToPage(page: PageKey) {
  window.location.hash = `#/${page}`;
}

export function navigateToBon(bonNumber: string) {
  window.location.hash = `#/bon/${encodeURIComponent(bonNumber)}`;
}
