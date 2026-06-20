import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./AppV3";
import { RootProviders } from "./RootProviders";

export function mountApp(target: Element) {
  createRoot(target).render(<StrictMode><RootProviders><App /></RootProviders></StrictMode>);
}
