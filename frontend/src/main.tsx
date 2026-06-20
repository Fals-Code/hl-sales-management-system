import "./app-styles";
import { bootstrapNotifications } from "./bootstrap-notifications";
import { mountApp } from "./mount-app";

bootstrapNotifications();
const root = document.querySelector("#root");
if (root) mountApp(root);
