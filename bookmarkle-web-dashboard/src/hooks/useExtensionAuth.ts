import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  sendToExtensionParent,
  createLoginSuccessMessage,
  type ExtensionResponse,
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

  const sendLoginData = useCallback(async () => {
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

      // Send to both background.js and parent (offscreen.js)
      const extensionId =  import.meta.env.VITE_EXTENSION_ID;

      console.log("📤 Preparing to send with extensionId:", extensionId);

      // 1. Send to background.js via chrome.runtime.sendMessage (if extensionId available)
      if (extensionId) {
        sendViaRuntimeAPI(extensionId, messageData);
      } else {
        console.log("⚠️ No extensionId - skipping background.js direct send (will use postMessage only)");
      }
      
      // 2. Send to parent (offscreen.js) via postMessage
      sendViaPostMessage(messageData);
    } catch (error) {
      console.error("❌ Error sending data to Extension:", error);
    }
  }, [user, extensionId, location]);

  // Auto-send on user login
  useEffect(() => {
    if (!isExtensionContext) return;

    // 로그아웃 시 ref 리셋 및 sessionStorage 정리
    if (!user) {
      if (sentToExtensionRef.current) {
        console.log("🔄 User logged out - resetting extension auth state");
      }
      sentToExtensionRef.current = false;
      clearExtensionAuthStorage();
      return;
    }

    // Check if we've already sent auth for this user in this session
    const sessionKey = `${EXTENSION_AUTH_STORAGE_KEY}_${user.uid}`;
    const wasSentInSession = !!sessionStorage.getItem(sessionKey);

    if (!wasSentInSession && !sentToExtensionRef.current) {
      sentToExtensionRef.current = true;
      sessionStorage.setItem(sessionKey, "true");
      console.log("📍 Sending auth to extension for:", user.email);
      sendLoginData();
    }
  }, [user, isExtensionContext, sendLoginData]);

  return { sendLoginData };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * sessionStorage에서 extension auth 관련 키 모두 제거
 */
function clearExtensionAuthStorage() {
  if (typeof sessionStorage === "undefined") return;

  const keysToRemove = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))
    .filter((key): key is string => !!key && key.startsWith(EXTENSION_AUTH_STORAGE_KEY));
  
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`🧹 Cleared: ${key}`);
  });
}

/**
 * Firebase ID 토큰 가져오기
 */
async function getIdToken(user: User): Promise<string> {
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Failed to get ID token:", error);
    return "";
  }
}

/**
 * Chrome Extension API를 통해 background.js로 메시지 전송
 */
function sendViaRuntimeAPI(extensionId: string, messageData: unknown) {
  type ChromeRuntime = {
    runtime?: {
      sendMessage?: (extensionId: string, msg: unknown, callback: () => void) => void;
      lastError?: { message?: string };
    };
  };

  const chrome = (window as { chrome?: ChromeRuntime }).chrome;

  if (!chrome?.runtime?.sendMessage) {
    console.warn("⚠️ chrome.runtime.sendMessage not available");
    return;
  }

  try {
    chrome.runtime.sendMessage(
      extensionId,
      {
        type: "LOGIN_SUCCESS",
        ...(messageData as Record<string, unknown>),
      },
      () => {
        if (chrome.runtime?.lastError) {
          console.error("❌ Failed to send to background:", chrome.runtime.lastError.message);
        } else {
          console.log("✅ Message sent to background.js");
        }
      }
    );
  } catch (error) {
    console.error("❌ Direct send failed:", error);
  }
}

/**
 * postMessage를 통해 parent (offscreen.js)로 메시지 전송
 */
function sendViaPostMessage(messageData: unknown) {
  try {
    // ExtensionResponse 타입으로 캐스팅
    sendToExtensionParent(messageData as ExtensionResponse);
    console.log("✅ Message sent to parent window");
  } catch (error) {
    console.error("❌ Parent postMessage failed:", error);
  }
}
