import { ShoppingBag } from "lucide-react";
import { useAppStore } from "./store";

export function StoreProducts() {
  const { products } = useAppStore();
  return <section className="acceptance-page"><h2><ShoppingBag size={24} /> Produk</h2>{products.map((product) => <p key={product.id}>{product.name}</p>)}</section>;
}
