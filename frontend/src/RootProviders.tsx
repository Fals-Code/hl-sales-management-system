import type { ReactNode } from "react";
import { NotificationProvider } from "./notification-store";
import { AppStoreProvider } from "./store";

export function RootProviders({ children }: { children: ReactNode }) {
  return <AppStoreProvider><NotificationProvider>{children}</NotificationProvider></AppStoreProvider>;
}
