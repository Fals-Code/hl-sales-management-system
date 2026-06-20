import { authApi } from "./api-client";

const FLAG = "__hlNotificationSessionBridgeInstalled";
type BridgeWindow = Window & { [FLAG]?: boolean };

export function installNotificationSessionBridge() {
  const bridgeWindow = window as BridgeWindow;
  if (bridgeWindow[FLAG]) return;
  bridgeWindow[FLAG] = true;

  const login = authApi.login;
  authApi.login = async (...args) => {
    const result = await login(...args);
    window.localStorage.setItem("hl-demo-session", "active");
    window.dispatchEvent(new Event("hashchange"));
    return result;
  };

  const me = authApi.me;
  authApi.me = async () => {
    const result = await me();
    window.localStorage.setItem("hl-demo-session", "active");
    window.dispatchEvent(new Event("hashchange"));
    return result;
  };

  const logout = authApi.logout;
  authApi.logout = async () => {
    const result = await logout();
    window.localStorage.removeItem("hl-demo-session");
    window.dispatchEvent(new Event("hashchange"));
    return result;
  };
}
