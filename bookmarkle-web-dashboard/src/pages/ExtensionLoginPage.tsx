import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useCallback } from "react";
import { useAuthStore } from "../stores";
import { useExtensionAuth } from "../hooks/useExtensionAuth";
import { useExtensionMessage } from "../hooks/useExtensionMessage";
import { isExtensionContext, getExtensionId } from "../utils/extensionMessaging";
import { ExtensionAuthContainer } from "../components/auth/ExtensionAuthContainer";
import { ExtensionLoginStatus } from "../components/auth/ExtensionLoginStatus";

export const ExtensionLoginPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive extension context from URL parameters
  const extensionIsContext = useMemo(() => isExtensionContext(location), [location]);
  const extensionId = useMemo(() => getExtensionId(location), [location]);

  // Setup extension hooks
  useExtensionAuth({
    user,
    isExtensionContext: extensionIsContext,
    extensionId,
  });

  useExtensionMessage({ user });

  // Navigation handlers
  const handleGoToDashboard = useCallback(() => navigate("/dashboard"), [navigate]);
  const handleCloseWindow = useCallback(() => window.close(), []);

  // Render appropriate view
  if (!user) {
    return (
      <ExtensionAuthContainer
        isExtensionContext={extensionIsContext}
        onAuthSuccess={() => {
          // Auto-send is handled by useExtensionAuth hook
        }}
      />
    );
  }

  return (
    <ExtensionLoginStatus
      user={user}
      isExtensionContext={extensionIsContext}
      onGoToDashboard={handleGoToDashboard}
      onCloseWindow={handleCloseWindow}
    />
  );
};
