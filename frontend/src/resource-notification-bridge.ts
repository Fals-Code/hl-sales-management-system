import { emitResourceActionNotification } from "./resource-action-notifications";
import { customerResourceApi, productResourceApi } from "./write-resources";

const BRIDGE_FLAG = "__hlResourceNotificationBridgeInstalled";
type BridgeWindow = Window & { [BRIDGE_FLAG]?: boolean };

export function installResourceNotificationBridge() {
  if (typeof window === "undefined") return;

  const bridgeWindow = window as BridgeWindow;
  if (bridgeWindow[BRIDGE_FLAG]) return;
  bridgeWindow[BRIDGE_FLAG] = true;

  const createCustomer = customerResourceApi.create;
  customerResourceApi.create = async (payload) => {
    const result = await createCustomer(payload);
    emitResourceActionNotification({ kind: "customer", action: "created", name: result.name, entityId: result.id });
    return result;
  };

  const updateCustomer = customerResourceApi.update;
  customerResourceApi.update = async (id, payload) => {
    const result = await updateCustomer(id, payload);
    emitResourceActionNotification({ kind: "customer", action: "updated", name: result.name, entityId: result.id });
    return result;
  };

  const removeCustomer = customerResourceApi.remove;
  customerResourceApi.remove = async (id) => {
    const result = await removeCustomer(id);
    emitResourceActionNotification({ kind: "customer", action: "deactivated", name: result.name, entityId: result.id });
    return result;
  };

  const createProduct = productResourceApi.create;
  productResourceApi.create = async (payload) => {
    const result = await createProduct(payload);
    emitResourceActionNotification({ kind: "product", action: "created", name: result.name, entityId: result.id });
    return result;
  };

  const updateProduct = productResourceApi.update;
  productResourceApi.update = async (id, payload) => {
    const result = await updateProduct(id, payload);
    emitResourceActionNotification({ kind: "product", action: "updated", name: result.name, entityId: result.id });
    return result;
  };

  const removeProduct = productResourceApi.remove;
  productResourceApi.remove = async (id) => {
    const result = await removeProduct(id);
    emitResourceActionNotification({ kind: "product", action: "deactivated", name: result.name, entityId: result.id });
    return result;
  };
}
