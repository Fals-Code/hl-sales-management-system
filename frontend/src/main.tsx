import React from "react";
import ReactDOM from "react-dom/client";
import App from "./AppV3";
import { AppStoreProvider } from "./store";
import "./styles.css";
import "./login.css";
import "./polish.css";
import "./responsive.css";
import "./summary-cards.css";
import "./clean-layout.css";
import "./workflow-pages.css";
import "./bon-form.css";
import "./final-template.css";
import "./acceptance-ui.css";
import "./acceptance-detail-polish.css";
import "./app-state.css";
import "./sidebar-refinement.css";
import "./navbar-refinement.css";
import "./profile-menu-refinement.css";
import "./bon-dialog-layout-fix.css";
import "./visual-hierarchy-refinement.css";
import "./settings-hierarchy-refinement.css";
import "./selective-card-system.css";
import "./dashboard-refinement.css";
import "./report-preview-refinement.css";
import "./phase4-audit.css";
import "./phase5-readiness.css";
import "./bon-create-page.css";
import "./bon-create-compat.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  </React.StrictMode>
);
