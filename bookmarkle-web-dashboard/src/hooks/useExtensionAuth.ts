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

const EXTENSION_AUTH_STORAGE_KEY = "extension_auth_sent";

export function useExtensionAuth({
  user,
  isExtensionContext,
  extensionId,
}: UseExtensionAuthOptions) {
  const location = useLocation();
  const sentToExtensionRef = useRef(false);

  // Auto-send on user login
  useEffect(() => {
    if (!isExtensionContext) {
      return;
    }

    // 로그아웃 시 ref 리셋 및 sessionStorage 정리
    if (!user) {
      if (sentToExtensionRef.current) {
        console.log("🔄 User logged out - resetting extension auth state");
      }
      sentToExtensionRef.current = false;

      // 로그아웃 시 모든 extension_auth_sent_* 키 제거
      if (typeof sessionStorage !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(EXTENSION_AUTH_STORAGE_KEY)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          sessionStorage.removeItem(key);
          console.log(`🧹 Cleared sessionStorage on logout: ${key}`);
        });
      }

      return;
    }

    // Check if we've already sent auth for this user in this session
    const sessionKey = `${EXTENSION_AUTH_STORAGE_KEY}_${user.uid}`;
    const wasSentInSession = sessionStorage.getItem(sessionKey);

    console.log(`📊 Auth state check for ${user.email}:`, {
      sessionKey,
      wasSentInSession: !!wasSentInSession,
      refAlreadySent: sentToExtensionRef.current,
    });

    if (!wasSentInSession && !sentToExtensionRef.current) {
      sentToExtensionRef.current = true;
      sessionStorage.setItem(sessionKey, "true");
      console.log(
        "📍 useEffect triggered: user logged in, sending to extension"
      );
      sendLoginData();
    } else {
      console.log("⏭️ Skipping: auth already sent or marked");
    }
  }, [user, isExtensionContext]);

  const sendLoginData = async () => {
    try {
      if (!user?.uid) {
        console.log("❌ sendLoginData: No user");
        return;
      }

      console.log("🔐 Starting login data send for:", user.email);

      // Parallelize token and collections fetch
      const results = await Promise.allSettled([
        getIdToken(user),
        fetchCollections(user.uid),
      ]);

      const idToken =
        results[0].status === "fulfilled" ? results[0].value : "";
      const collections =
        results[1].status === "fulfilled" ? results[1].value : [];

      console.log("✅ Token fetched:", !!idToken);
      console.log("✅ Collections fetched:", collections.length, "items");

      if (results[1].status === "rejected") {
        console.error(
          "⚠️ Failed to fetch collections:",
          results[1].reason
        );
        // Collection load failure doesn't block login info transmission
      }

      // Create message data
      const messageData = createLoginSuccessMessage(user, idToken, collections);

      // Send via appropriate method
      const finalExtensionId = extensionId || getExtensionId(location);

      console.log("📤 Preparing to send with extensionId:", finalExtensionId);

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
