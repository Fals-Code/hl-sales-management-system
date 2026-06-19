import { useAppStore } from "./store";

export function StoreReports() {
  const { bons } = useAppStore();
  return <section>{bons.length}</section>;
}
