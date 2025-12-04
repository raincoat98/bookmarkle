import { useAuthStore } from "../stores";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { FirebaseError } from "firebase/app";
import { toast } from "react-hot-toast";
import {
  fetchCollections,
  fetchBookmarks,
  saveBookmarkDirect,
  createCollection,
  getUserNotificationSettings,
} from "../utils/firestoreService";
import type { Collection } from "../types";

export const ExtensionLoginSuccessPage = () => {
  const { user, login, loginWithEmail, signup } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const sentToExtensionRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    // Extension에서 온 요청이고 로그인된 상태라면 자동으로 Extension에 데이터 전달
    const urlParams = new URLSearchParams(location.search);
    const source = urlParams.get("source");

    // 이미 전송했으면 다시 전송하지 않음 (무한 루프 방지)
    if (source === "extension" && user && !sentToExtensionRef.current) {
      sentToExtensionRef.current = true;
      console.log(
        "📍 useEffect triggered: user logged in, sending to extension"
      );
      sendToExtensionParent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Keep user ref in sync with current user
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Extension의 offscreen에서 메시지를 받는 핸들러
    const handleMessage = async (event: MessageEvent) => {
      // Firebase 내부 메시지는 필터링
      if (typeof event.data === "string" && event.data.startsWith("!_{")) {
        return;
      }

      // console.log(
      //   "🔥 Message received in ExtensionLoginSuccessPage:",
      //   event.data
      // );

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // console.log("📦 Parsed message data:", data);

        // getCollections 요청 처리
        if (data?.getCollections) {
          console.log("📬 Received getCollections request from offscreen");
          console.log(
            "📬 User ID check:",
            userRef.current?.uid ? "✅ Available" : "❌ Missing"
          );

          if (!userRef.current?.uid) {
            console.error("❌ No user ID to fetch collections");
            window.parent.postMessage(
              {
                type: "COLLECTIONS_ERROR",
                message: "No user ID",
              },
              "*"
            );
            return;
          }

          try {
            console.log(
              "📬 Fetching collections for user:",
              userRef.current.uid
            );
            // 컬렉션 가져오기
            const collections = await fetchCollections(userRef.current.uid);
            console.log(
              "✅ Collections fetched successfully:",
              collections.length,
              "items"
            );
            console.log("📦 Sending collections to offscreen:", collections);

            window.parent.postMessage(
              {
                type: "COLLECTIONS_DATA",
                collections: collections,
              },
              "*"
            );
            console.log("✅ Collections message sent to offscreen");
          } catch (error) {
            console.error("❌ Error fetching collections:", error);
            console.error("❌ Error details:", {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            });
            window.parent.postMessage(
              {
                type: "COLLECTIONS_ERROR",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              "*"
            );
          }
        }

        // getBookmarks 요청 처리
        if (data?.getBookmarks) {
          console.log(
            "📬 Received getBookmarks request from offscreen, collectionId:",
            data.collectionId
          );
          console.log(
            "📬 User ID check:",
            userRef.current?.uid ? "✅ Available" : "❌ Missing"
          );

          if (!userRef.current?.uid) {
            console.error("❌ No user ID to fetch bookmarks");
            window.parent.postMessage(
              {
                type: "BOOKMARKS_ERROR",
                message: "No user ID",
              },
              "*"
            );
            return;
          }

          try {
            console.log(
              "📬 Fetching bookmarks for user:",
              userRef.current.uid,
              "collection:",
              data.collectionId
            );
            // 북마크 가져오기
            const bookmarks = await fetchBookmarks(
              userRef.current.uid,
              data.collectionId
            );
            console.log(
              "✅ Bookmarks fetched successfully:",
              bookmarks.length,
              "items"
            );
            console.log("📦 Sending bookmarks to offscreen:", bookmarks);

            window.parent.postMessage(
              {
                type: "BOOKMARKS_DATA",
                bookmarks: bookmarks,
                collectionId: data.collectionId,
              },
              "*"
            );
            console.log("✅ Bookmarks message sent to offscreen");
          } catch (error) {
            console.error("❌ Error fetching bookmarks:", error);
            console.error("❌ Error details:", {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            });
            window.parent.postMessage(
              {
                type: "BOOKMARKS_ERROR",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              "*"
            );
          }
        }

        // saveBookmark 요청 처리
        if (data?.saveBookmark) {
          console.log("📬 Received saveBookmark request from offscreen");
          console.log("📬 Bookmark data:", data.bookmarkData);
          console.log(
            "📬 User ID check:",
            userRef.current?.uid ? "✅ Available" : "❌ Missing"
          );

          if (!userRef.current?.uid) {
            console.error("❌ No user ID to save bookmark");
            window.parent.postMessage(
              {
                type: "BOOKMARK_SAVE_ERROR",
                message: "No user ID",
              },
              "*"
            );
            return;
          }

          try {
            console.log("📬 Saving bookmark for user:", userRef.current.uid);
            // 북마크 저장
            const bookmarkData = {
              ...data.bookmarkData,
              userId: userRef.current.uid,
            };

            const bookmarkId = await saveBookmarkDirect(bookmarkData);
            console.log("✅ Bookmark saved successfully with ID:", bookmarkId);
            console.log("📦 Sending bookmark saved confirmation to offscreen");

            window.parent.postMessage(
              {
                type: "BOOKMARK_SAVED",
                bookmarkId: bookmarkId,
              },
              "*"
            );
            console.log("✅ Bookmark saved message sent to offscreen");
          } catch (error) {
            console.error("❌ Error saving bookmark:", error);
            console.error("❌ Error details:", {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            });
            window.parent.postMessage(
              {
                type: "BOOKMARK_SAVE_ERROR",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              "*"
            );
          }
        }

        // createCollection 요청 처리
        if (data?.createCollection) {
          console.log("📬 Received createCollection request from offscreen");
          console.log("📬 Collection data:", data.collectionData);
          console.log(
            "📬 User ID check:",
            userRef.current?.uid ? "✅ Available" : "❌ Missing"
          );

          if (!userRef.current?.uid) {
            console.error("❌ No user ID to create collection");
            window.parent.postMessage(
              {
                type: "COLLECTION_CREATE_ERROR",
                message: "No user ID",
              },
              "*"
            );
            return;
          }

          try {
            console.log(
              "📬 Creating collection for user:",
              userRef.current.uid
            );
            // 컬렉션 생성
            const collectionData = {
              ...data.collectionData,
              userId: userRef.current.uid,
            };

            const collectionId = await createCollection(collectionData);
            console.log(
              "✅ Collection created successfully with ID:",
              collectionId
            );
            console.log(
              "📦 Sending collection created confirmation to offscreen"
            );

            window.parent.postMessage(
              {
                type: "COLLECTION_CREATED",
                collectionId: collectionId,
              },
              "*"
            );
            console.log("✅ Collection created message sent to offscreen");
          } catch (error) {
            console.error("❌ Error creating collection:", error);
            console.error("❌ Error details:", {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            });
            window.parent.postMessage(
              {
                type: "COLLECTION_CREATE_ERROR",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              "*"
            );
          }
        }

        // getNotificationSettings 요청 처리
        if (data?.getNotificationSettings) {
          console.log(
            "📬 Received getNotificationSettings request from offscreen"
          );
          console.log(
            "📬 User ID check:",
            userRef.current?.uid ? "✅ Available" : "❌ Missing"
          );

          if (!userRef.current?.uid) {
            console.error("❌ No user ID to fetch notification settings");
            window.parent.postMessage(
              {
                type: "NOTIFICATION_SETTINGS_ERROR",
                message: "No user ID",
              },
              "*"
            );
            return;
          }

          try {
            console.log(
              "📬 Fetching notification settings for user:",
              userRef.current.uid
            );
            // 알림 설정 가져오기
            const settings = await getUserNotificationSettings(
              userRef.current.uid
            );
            console.log(
              "✅ Notification settings fetched successfully:",
              settings
            );
            console.log(
              "📦 Sending notification settings to offscreen:",
              settings
            );

            window.parent.postMessage(
              {
                type: "NOTIFICATION_SETTINGS_DATA",
                ...settings,
              },
              "*"
            );
            console.log("✅ Notification settings message sent to offscreen");
          } catch (error) {
            console.error("❌ Error fetching notification settings:", error);
            console.error("❌ Error details:", {
              message: error instanceof Error ? error.message : String(error),
              code: (error as any)?.code,
            });
            window.parent.postMessage(
              {
                type: "NOTIFICATION_SETTINGS_ERROR",
                message:
                  error instanceof Error ? error.message : "Unknown error",
              },
              "*"
            );
          }
        }
      } catch (error) {
        console.error("🔥 Error processing message from offscreen:", error);
        console.error("🔥 Error details:", {
          message: error instanceof Error ? error.message : String(error),
          type: typeof error,
        });
      }
    };

    console.log("📌 Message listener attached to ExtensionLoginSuccessPage");
    window.addEventListener("message", handleMessage);

    // iframe이 준비됨을 offscreen에 알림
    try {
      window.parent.postMessage({ type: "IFRAME_READY" }, "*");
      console.log("✅ IFRAME_READY signal sent to offscreen");
    } catch (error) {
      console.error("Failed to send IFRAME_READY signal:", error);
    }

    return () => {
      console.log("📌 Message listener removed from ExtensionLoginSuccessPage");
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await login();
      // 로그인 성공 후 Extension에 데이터 전달
      const urlParams = new URLSearchParams(location.search);
      const source = urlParams.get("source");
      if (source === "extension") {
        // 플래그 리셋하고 useEffect가 다시 실행되도록 유도
        sentToExtensionRef.current = false;
      }
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === "auth/popup-closed-by-user") {
        toast.error("로그인이 취소되었습니다.");
      } else {
        console.error("Google login error:", error);
        toast.error("Google 로그인에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSignup) {
      // 가입 로직
      if (formData.password !== formData.confirmPassword) {
        toast.error("비밀번호가 일치하지 않습니다.");
        return;
      }

      if (formData.password.length < 6) {
        toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
      }

      try {
        setLoading(true);
        await signup(formData.email, formData.password, formData.displayName);
        toast.success("가입이 완료되었습니다!");
        // 가입 성공 후 Extension에 데이터 전달
        const urlParams = new URLSearchParams(location.search);
        const source = urlParams.get("source");
        if (source === "extension") {
          // 플래그 리셋하고 useEffect가 다시 실행되도록 유도
          sentToExtensionRef.current = false;
        }
      } catch (error: unknown) {
        const firebaseError = error as FirebaseError;
        if (firebaseError.code === "auth/email-already-in-use") {
          toast.error("이미 가입된 이메일입니다. 로그인해주세요.");
          setIsSignup(false);
          setFormData((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }));
        } else if (firebaseError.code === "auth/weak-password") {
          toast.error("비밀번호는 최소 6자 이상이어야 합니다.");
        } else if (firebaseError.code === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (firebaseError.code === "auth/operation-not-allowed") {
          toast.error("이메일/비밀번호 가입이 비활성화되어 있습니다.");
        } else {
          console.error("Signup error:", error);
          toast.error("가입 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      } finally {
        setLoading(false);
      }
    } else {
      // 로그인 로직
      try {
        setLoading(true);
        await loginWithEmail(formData.email, formData.password);
        // 로그인 성공 후 Extension에 데이터 전달
        const urlParams = new URLSearchParams(location.search);
        const source = urlParams.get("source");
        if (source === "extension") {
          // 플래그 리셋하고 useEffect가 다시 실행되도록 유도
          sentToExtensionRef.current = false;
        }
      } catch (error: unknown) {
        const firebaseError = error as FirebaseError;
        if (firebaseError.code === "auth/user-not-found") {
          toast.error("등록되지 않은 이메일입니다. 가입해주세요.");
          setIsSignup(true);
        } else if (firebaseError.code === "auth/wrong-password") {
          toast.error("비밀번호가 올바르지 않습니다.");
          setFormData((prev) => ({
            ...prev,
            password: "",
          }));
        } else if (firebaseError.code === "auth/invalid-email") {
          toast.error("올바른 이메일 형식이 아닙니다.");
        } else if (firebaseError.code === "auth/too-many-requests") {
          toast.error(
            "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
          );
        } else if (firebaseError.code === "auth/user-disabled") {
          toast.error("비활성화된 계정입니다.");
        } else {
          console.error("Login error:", error);
          toast.error("로그인에 실패했습니다. 다시 시도해주세요.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    resetForm();
  };

  /**
   * Extension으로 로그인 정보 전달
   * 1. iframe에서 열렸으면: window.parent.postMessage로 offscreen.js에 전달
   * 2. 새 탭에서 열렸으면: chrome.runtime.sendMessage로 background.js에 전달
   */
  const sendToExtensionParent = async () => {
    try {
      if (!user?.uid) {
        console.log("❌ sendToExtensionParent: No user");
        return;
      }

      // ID Token 가져오기
      const idToken = await getIdToken();

      // 컬렉션 데이터 가져오기
      let collections: Collection[] = [];
      try {
        collections = await fetchCollections(user.uid);
      } catch (collectionError) {
        console.error("⚠️ Failed to fetch collections:", collectionError);
        // 컬렉션 로드 실패해도 로그인 정보는 전달
      }

      // 로그인 정보 패키지
      const messageData = {
        type: "LOGIN_SUCCESS",
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
        },
        idToken: idToken,
        collections: collections,
      };

      // URL에서 extensionId 파라미터 추출
      const urlParams = new URLSearchParams(location.search);
      const EXTENSION_ID = urlParams.get("extensionId") as string;

      // 방법 1: extensionId가 있으면 chrome.runtime.sendMessage로 직접 background.js로 전송
      if (EXTENSION_ID && typeof window !== "undefined") {
        const chromeRuntime = (window as unknown as Record<string, unknown>)
          .chrome as
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
              EXTENSION_ID,
              {
                type: "LOGIN_SUCCESS",
                user: messageData.user,
                idToken: idToken,
                collections: messageData.collections,
              },
              () => {
                if (chromeRuntime.runtime?.lastError) {
                  console.log(
                    "ℹ️ Direct send failed, fallback to parent postMessage"
                  );
                  // Fallback: offscreen.js로 전송
                  try {
                    window.parent.postMessage(messageData, "*");
                    console.log(
                      "✅ Message sent to parent window (iframe fallback mode)"
                    );
                  } catch {
                    console.error("❌ Both methods failed");
                  }
                } else {
                  console.log("✅ Message sent to background.js (direct mode)");
                }
              }
            );
          } catch (error) {
            console.log("⚠️ Direct send failed:", error);
            // Fallback: offscreen.js로 전송
            try {
              window.parent.postMessage(messageData, "*");
              console.log(
                "✅ Message sent to parent window (iframe fallback mode)"
              );
            } catch {
              console.error("❌ Both methods failed");
            }
          }
        }
      } else {
        // 방법 2: extensionId가 없으면 iframe 모드로 offscreen.js를 거쳐 background로 전송

        console.log("📤 Sending login data to Extension:", messageData);

        try {
          window.parent.postMessage(messageData, "*");
          console.log("✅ Message sent to parent window (iframe mode)");
        } catch (error) {
          console.error("❌ Parent postMessage failed:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error sending data to Extension:", error);
    }
  };

  /**
   * Firebase에서 현재 사용자의 ID Token 가져오기
   */
  const getIdToken = async (): Promise<string> => {
    try {
      const { auth } = await import("../firebase");
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    } catch (error) {
      console.error("Failed to get ID token:", error);
    }
    return "";
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  const handleCloseWindow = () => {
    window.close();
  };

  // 로그인되지 않았으면 로그인/가입 폼 표시
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="card p-8">
            <div className="text-center mb-6">
              {/* Extension 접속 알림 */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <span className="text-2xl">🔌</span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Chrome Extension에서 접속됨
                </p>
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {isSignup ? "가입하기" : "로그인"}
              </h2>
            </div>

            {/* 이메일/비밀번호 폼 */}
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignup && (
                <div>
                  <label
                    htmlFor="displayName"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    사용자명
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required={isSignup}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="사용자명을 입력하세요"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="이메일을 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>

              {isSignup && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    비밀번호 확인
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={isSignup}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span>{isSignup ? "가입하기" : "로그인"}</span>
                )}
              </button>
            </form>

            {/* 구분선 */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  또는
                </span>
              </div>
            </div>

            {/* Google 로그인 버튼 */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google로 {isSignup ? "가입" : "로그인"}</span>
            </button>

            {/* 모드 전환 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}
                <button
                  onClick={toggleMode}
                  className="ml-1 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium"
                >
                  {isSignup ? "로그인" : "가입하기"}
                </button>
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                로그인 후 Extension에 연결됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 로그인된 상태
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          {/* Extension 접속 알림 */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl">🔌</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Chrome Extension에서 접속됨
            </p>
          </div>

          {/* 로그인/로그아웃 상태 표시 */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              로그인 상태
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              안녕하세요,{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {user?.displayName || user?.email}
              </span>
              님!
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              북마클에 로그인되어 있습니다.
            </p>
          </div>

          {/* 액션 버튼들 */}
          <div className="space-y-3">
            <button
              onClick={handleGoToDashboard}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>대시보드로 가기</span>
            </button>

            <button
              onClick={handleCloseWindow}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>창 닫기</span>
            </button>
          </div>

          {/* 추가 안내 */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              이제 Chrome Extension에서 북마크를 관리할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
