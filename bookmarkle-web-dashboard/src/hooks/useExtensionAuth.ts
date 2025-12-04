import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  sendToExtensionParent,
  createLoginSuccessMessage,
  getExtensionId,
} from "../utils/extensionMessaging";
import { fetchCollections } from "../utils/firestoreService";
import type { User } from "firebase/auth";

interface UseExtensionAuthOptions {
  user: User | null;
  isExtensionContext: boolean;
  extensionId: string | null;
}

export function useExtensionAuth({
  user,
  isExtensionContext,
  extensionId,
}: UseExtensionAuthOptions) {
  const sentToExtensionRef = useRef(false);
  const location = useLocation();

  // Auto-send on user login
  useEffect(() => {
    if (isExtensionContext && user && !sentToExtensionRef.current) {
      sentToExtensionRef.current = true;
      console.log(
        "📍 useEffect triggered: user logged in, sending to extension"
      );
      sendLoginData();
    }
  }, [user, isExtensionContext]);

  const sendLoginData = async () => {
    try {
      if (!user?.uid) {
        console.log("❌ sendLoginData: No user");
        return;
      }

      // Get ID Token
      const idToken = await getIdToken(user);

      // Fetch collections
      let collections: any[] = [];
      try {
        collections = await fetchCollections(user.uid);
      } catch (collectionError) {
        console.error("⚠️ Failed to fetch collections:", collectionError);
        // Collection load failure doesn't block login info transmission
      }

      // Create message data
      const messageData = createLoginSuccessMessage(user, idToken, collections);

      // Send via appropriate method
      const finalExtensionId = extensionId || getExtensionId(location);

      if (finalExtensionId && typeof window !== "undefined") {
        sendViaRuntimeAPI(finalExtensionId, messageData);
      } else {
        sendViaPostMessage(messageData);
      }
    } catch (error) {
      console.error("❌ Error sending data to Extension:", error);
    }
  };

  return { sendLoginData };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getIdToken(user: User): Promise<string> {
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Failed to get ID token:", error);
  }
  return "";
}

function sendViaRuntimeAPI(extensionId: string, messageData: unknown) {
  const chromeRuntime = (
    window as unknown as Record<string, unknown>
  ).chrome as
    | {
        runtime?: {
          sendMessage?: (
            extensionId: string,
            msg: unknown,
            callback: () => void
          ) => void;
          lastError?: unknown;
        };
      }
    | undefined;

  if (chromeRuntime?.runtime?.sendMessage) {
    try {
      chromeRuntime.runtime.sendMessage(
        extensionId,
        {
          type: "LOGIN_SUCCESS",
          ...(messageData as Record<string, unknown>),
        },
        () => {
          if (chromeRuntime.runtime?.lastError) {
            console.log(
              "ℹ️ Direct send failed, fallback to parent postMessage"
            );
            // Fallback to iframe mode
            sendViaPostMessage(messageData);
          } else {
            console.log("✅ Message sent to background.js (direct mode)");
          }
        }
      );
    } catch (error) {
      console.log("⚠️ Direct send failed:", error);
      // Fallback to iframe mode
      sendViaPostMessage(messageData);
    }
  }
}

function sendViaPostMessage(messageData: unknown) {
  console.log("📤 Sending login data to Extension:", messageData);

  try {
    sendToExtensionParent(messageData as any);
    console.log("✅ Message sent to parent window (iframe mode)");
  } catch (error) {
    console.error("❌ Parent postMessage failed:", error);
  }
}
