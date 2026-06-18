import type { PageKey } from "./data";

const pageKeys: PageKey[] = ["dashboard", "customers", "products", "bons", "receivables", "settlements", "bonus", "reports", "settings"];

export type HashRoute = {
  page: PageKey;
  bonNumber: string | null;
  notFound: boolean;
};

export function readHashRoute(): HashRoute {
  const raw = window.location.hash.startsWith("#/") ? window.location.hash.slice(2) : "";
  const parts = raw.split("/").filter(Boolean);

  if (parts.length === 0) return { page: "dashboard", bonNumber: null, notFound: false };

  if (parts[0] === "bon" && parts[1]) {
    return { page: "bons", bonNumber: decodeURIComponent(parts.slice(1).join("/")), notFound: false };
  }

  if (parts.length === 1 && pageKeys.includes(parts[0] as PageKey)) {
    return { page: parts[0] as PageKey, bonNumber: null, notFound: false };
  }

  return { page: "dashboard", bonNumber: null, notFound: true };
}

export function navigateToPage(page: PageKey) {
  window.location.hash = `#/${page}`;
}

export function navigateToBon(bonNumber: string) {
  window.location.hash = `#/bon/${encodeURIComponent(bonNumber)}`;
}
