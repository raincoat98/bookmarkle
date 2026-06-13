import { BrowserRouter as Router } from "react-router-dom";
import { AppRoutes } from "./router/routes";
import { AppToaster } from "./components/common/AppToaster";
import { useAppInitialization } from "./hooks/app/useAppInitialization";
import { useExtensionLogoutListener } from "./hooks/app/useExtensionLogoutListener";
import { useSubscriptionListener } from "./hooks/app/useSubscriptionListener";
import { usePeriodicBackup } from "./hooks/app/usePeriodicBackup";
import { usePeriodicTrashCleanup } from "./hooks/app/usePeriodicTrashCleanup";

function App() {
  useAppInitialization();
  useExtensionLogoutListener();
  useSubscriptionListener();
  usePeriodicBackup();
  usePeriodicTrashCleanup();

  return (
    <Router>
      <AppRoutes />
      <AppToaster />
    </Router>
  );
}

export default App;
