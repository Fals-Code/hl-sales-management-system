import { useEffect, useRef } from "react";
import { StoreBonCreatePage } from "./store-bon-create";

export function StoreBonCreateCompatPage(props: Parameters<typeof StoreBonCreatePage>[0]) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let initialized = false;
    const addInitialProduct = () => {
      if (initialized || !rootRef.current) return;
      const button = rootRef.current.querySelector<HTMLButtonElement>(".bon-product-option button:not(:disabled)");
      if (!button) return;
      initialized = true;
      button.click();
    };
    addInitialProduct();
    const observer = new MutationObserver(addInitialProduct);
    if (rootRef.current) observer.observe(rootRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <div className="bon-create-route" role="dialog" aria-label="Buat Bon" ref={rootRef}>
    <StoreBonCreatePage {...props} />
    <button className="button button--primary bon-create-compat-finish" type="button" onClick={props.onCancel}>Selesai</button>
  </div>;
}
