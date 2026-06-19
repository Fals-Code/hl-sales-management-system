import type { PageKey } from "./data";

const pageKeys: PageKey[] = ["dashboard", "customers", "products", "bons", "create-bon", "receivables", "settlements", "bonus", "reports", "settings"];

export type HashRoute = {
  page: PageKey;
  bonNumber: string | null;
  createBonMode: "normal" | "bonus" | null;
  createBonCustomerCode: string | null;
  notFound: boolean;
};

export function readHashRoute(): HashRoute {
  const raw = window.location.hash.startsWith("#/") ? window.location.hash.slice(2) : "";
  const [path, queryString = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const query = new URLSearchParams(queryString);
  const base = { bonNumber: null, createBonMode: null, createBonCustomerCode: null, notFound: false } as const;

  if (parts.length === 0) return { page: "dashboard", ...base };

  if (parts[0] === "bon" && parts[1]) {
    return { page: "bons", bonNumber: decodeURIComponent(parts.slice(1).join("/")), createBonMode: null, createBonCustomerCode: null, notFound: false };
  }

  if (parts[0] === "bons" && parts[1] === "new") {
    return {
      page: "create-bon",
      bonNumber: null,
      createBonMode: query.get("mode") === "bonus" ? "bonus" : "normal",
      createBonCustomerCode: query.get("customer"),
      notFound: false
    };
  }

  if (parts.length === 1 && pageKeys.includes(parts[0] as PageKey)) {
    return { page: parts[0] as PageKey, ...base };
  }

  return { page: "dashboard", bonNumber: null, createBonMode: null, createBonCustomerCode: null, notFound: true };
}

export function navigateToPage(page: PageKey) {
  window.location.hash = page === "create-bon" ? "#/bons/new" : `#/${page}`;
}

export function navigateToBon(bonNumber: string) {
  window.location.hash = `#/bon/${encodeURIComponent(bonNumber)}`;
}

export function navigateToCreateBon(customerCode?: string, mode: "normal" | "bonus" = "normal") {
  const query = new URLSearchParams({ mode });
  if (customerCode) query.set("customer", customerCode);
  window.location.hash = `#/bons/new?${query.toString()}`;
}
