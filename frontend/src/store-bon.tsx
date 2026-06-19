import { useAppStore } from "./store";

export function StoreBonDialog() {
  const { bons } = useAppStore();
  return <div>{bons.length}</div>;
}
