import type { ReactNode } from "react";
import { RupiahInputScope } from "./RupiahInputScope";
import { NotificationProvider } from "./notification-store";
import { AppStoreProvider } from "./store";

export function RootProviders({ children }: { children: ReactNode }) {
  return <AppStoreProvider><NotificationProvider><RupiahInputScope>{children}</RupiahInputScope></NotificationProvider></AppStoreProvider>;
}
