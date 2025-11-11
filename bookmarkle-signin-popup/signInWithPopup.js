import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

// 브라우저 감지 유틸리티
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();

  // 카카오톡 인앱 브라우저 감지
  const isKakaoTalk = userAgent.includes("kakaotalk");

  // 네이버 앱 브라우저 감지 (웨일 브라우저는 제외)
  const isNaverApp =
    userAgent.includes("naver") && !userAgent.includes("whale");

  // 라인 앱 브라우저 감지
  const isLineApp = userAgent.includes("line");

  // 페이스북 인앱 브라우저 감지
  const isFacebookApp =
    userAgent.includes("fbav") || userAgent.includes("fban");

  // 인스타그램 인앱 브라우저 감지
  const isInstagramApp = userAgent.includes("instagram");

  // 웨일 브라우저 감지 (Chromium 기반이므로 호환 가능)
  const isWhale = userAgent.includes("whale");

  // 기타 인앱 브라우저 감지 패턴
  const isInAppBrowser =
    isKakaoTalk ||
    isNaverApp ||
    isLineApp ||
    isFacebookApp ||
    isInstagramApp ||
    userAgent.includes("wv") || // WebView 감지
    (userAgent.includes("version") && userAgent.includes("mobile"));

  // 브라우저 이름 결정
  let browserName = "알 수 없는 브라우저";
  if (isKakaoTalk) browserName = "카카오톡";
  else if (isNaverApp) browserName = "네이버 앱";
  else if (isWhale) browserName = "웨일";
  else if (isLineApp) browserName = "라인";
  else if (isFacebookApp) browserName = "페이스북";
  else if (isInstagramApp) browserName = "인스타그램";
  else if (userAgent.includes("chrome")) browserName = "Chrome";
  else if (userAgent.includes("safari")) browserName = "Safari";
  else if (userAgent.includes("firefox")) browserName = "Firefox";
  else if (userAgent.includes("edge")) browserName = "Edge";

  // 호환성 판단 - 인앱 브라우저는 대부분 구글 로그인에 제한이 있음
  const isCompatible = !isInAppBrowser;

  return {
    name: browserName,
    isCompatible,
    isInAppBrowser,
    userAgent: navigator.userAgent,
  };
}

function getBrowserCompatibilityMessage(browserInfo) {
  if (browserInfo.isCompatible) {
    return "";
  }

  if (browserInfo.isInAppBrowser) {
    return `${browserInfo.name}에서는 구글 로그인이 제한될 수 있습니다. 더 나은 경험을 위해 일반 브라우저(Chrome, Safari 등)에서 접속해주세요.`;
  }

  return "현재 브라우저에서는 구글 로그인이 제한될 수 있습니다. Chrome, Safari, Edge, 웨일 등의 브라우저를 사용해주세요.";
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 전역 상태 변수들
let isLoggingOut = false; // 로그아웃 진행 중 플래그

// Firebase 로컬 저장소 완전 클리어 함수
async function clearFirebaseStorage() {
  try {
    console.log("Clearing Firebase local storage...");

    // localStorage에서 Firebase 관련 키 제거
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("firebase:") || key.startsWith("firebaseui:"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log("localStorage cleared:", keysToRemove.length, "keys removed");

    // IndexedDB에서 Firebase 데이터베이스 삭제
    if ("indexedDB" in window) {
      try {
        const databases = await indexedDB.databases();
        const firebaseDbs = databases.filter(
          (db) =>
            db.name &&
            (db.name.includes("firebase") ||
              db.name.includes("firebaseLocalStorageDb"))
        );

        for (const db of firebaseDbs) {
          console.log("Deleting IndexedDB:", db.name);
          const deleteReq = indexedDB.deleteDatabase(db.name);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => resolve();
            deleteReq.onerror = () => reject(deleteReq.error);
          });
        }
        console.log(
          "IndexedDB cleared:",
          firebaseDbs.length,
          "databases removed"
        );
      } catch (error) {
        console.warn("IndexedDB clear failed:", error);
      }
    }

    console.log("Firebase storage clearing completed");
  } catch (error) {
    console.error("Error clearing Firebase storage:", error);
  }
}

// Provider 설정 - popup 관련 설정 추가
provider.setCustomParameters({
  prompt: "select_account",
});

// Persistence 설정
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to set persistence:", error);
});

// 부모(= offscreen 문서) 오리진
const PARENT_ORIGIN = document.location.ancestorOrigins?.[0] || "*";

function send(result) {
  // 부모(offscreen)로 결과 전달 → background → popup
  console.log("Sending result to parent:", result);
  window.parent.postMessage(JSON.stringify(result), PARENT_ORIGIN);
}

window.addEventListener("message", async (ev) => {
  console.log("🔥 Message received in signin-popup:", ev.data);

  if (ev.data?.initAuth) {
    console.log("Starting Firebase Auth...");
    try {
      const userCredential = await signInWithPopup(auth, provider);
      console.log("Auth successful:", userCredential.user);

      // ID 토큰 가져오기
      const idToken = await userCredential.user.getIdToken();

      send({
        user: toSafeUser(userCredential.user),
        idToken: idToken,
        userCredential: { user: toSafeUser(userCredential.user) },
      });
    } catch (e) {
      console.error("Auth error:", e);
      send({
        name: e.name || "FirebaseError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // 컬렉션 생성 요청
  if (ev.data?.createCollection) {
    try {
      let currentUser = auth.currentUser;

      // 현재 사용자가 없고 idToken이 있으면 세션 복원 시도
      if (!currentUser && ev.data.idToken) {
        try {
          await setPersistence(auth, browserLocalPersistence);

          // 세션 복원 대기
          currentUser = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log("Auth state restoration timeout");
              resolve(auth.currentUser);
            }, 7000);

            if (auth.currentUser) {
              clearTimeout(timeout);
              resolve(auth.currentUser);
              return;
            }

            const unsubscribe = auth.onAuthStateChanged((user) => {
              console.log("Auth state changed:", user ? user.uid : "null");
              if (user) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(user);
              }
            });
          });
        } catch (error) {
          console.error("Failed to restore session with idToken:", error);
        }
      }

      // 현재 사용자가 없으면 세션 복원 대기
      if (!currentUser) {
        console.log("Waiting for auth state restoration...");
        currentUser = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log("Auth state restoration timeout");
            resolve(auth.currentUser);
          }, 5000);

          if (auth.currentUser) {
            clearTimeout(timeout);
            resolve(auth.currentUser);
            return;
          }

          const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user ? user.uid : "null");
            if (user) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(user);
            }
          });
        });
      }

      if (!currentUser) {
        console.error("User not authenticated");
        send({
          type: "COLLECTION_CREATE_ERROR",
          name: "AuthError",
          code: "auth/not-authenticated",
          message: "User is not authenticated. Please sign in first.",
        });
        return;
      }

      console.log(
        "Creating collection for authenticated user:",
        currentUser.uid
      );

      // 현재 로그인된 사용자의 ID로 컬렉션 데이터 업데이트
      const collectionData = {
        ...ev.data.collectionData,
        userId: currentUser.uid,
      };

      const collectionId = await createCollection(collectionData);
      console.log("Collection created with ID:", collectionId);
      send({
        type: "COLLECTION_CREATED",
        collectionId: collectionId,
      });
    } catch (e) {
      console.error("Collection create error:", e);
      send({
        type: "COLLECTION_CREATE_ERROR",
        name: e.name || "FirestoreError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // 컬렉션 데이터 요청
  if (ev.data?.getCollections) {
    console.log("Getting collections request received");
    console.log("Received idToken:", ev.data.idToken ? "Yes" : "No");

    try {
      // 현재 로그인된 사용자 확인
      let currentUser = auth.currentUser;

      // 현재 사용자가 없고 idToken이 있으면 세션 복원 시도
      if (!currentUser && ev.data.idToken) {
        console.log(
          "Attempting to restore Firebase Auth session with idToken..."
        );

        try {
          await setPersistence(auth, browserLocalPersistence);

          // 세션 복원 대기
          currentUser = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log("Auth state restoration timeout");
              resolve(auth.currentUser);
            }, 7000);

            if (auth.currentUser) {
              clearTimeout(timeout);
              resolve(auth.currentUser);
              return;
            }

            const unsubscribe = auth.onAuthStateChanged((user) => {
              console.log("Auth state changed:", user ? user.uid : "null");
              if (user) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(user);
              }
            });
          });
        } catch (error) {
          console.error("Failed to restore session with idToken:", error);
        }
      }

      // 현재 사용자가 없으면 세션 복원 대기
      if (!currentUser) {
        console.log("Waiting for auth state restoration...");
        currentUser = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log("Auth state restoration timeout");
            resolve(auth.currentUser);
          }, 5000);

          // 먼저 현재 상태 확인
          if (auth.currentUser) {
            clearTimeout(timeout);
            resolve(auth.currentUser);
            return;
          }

          // 상태 변경 대기
          const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log("Auth state changed:", user ? user.uid : "null");
            if (user) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(user);
            }
          });
        });
      }

      if (!currentUser) {
        console.error("User not authenticated");
        send({
          type: "COLLECTIONS_ERROR",
          name: "AuthError",
          code: "auth/not-authenticated",
          message: "User is not authenticated. Please sign in first.",
        });
        return;
      }

      console.log(
        "Fetching collections for authenticated user:",
        currentUser.uid
      );
      const collections = await fetchCollections(currentUser.uid);
      console.log("Collections fetched:", collections.length);
      send({
        type: "COLLECTIONS_DATA",
        collections: collections,
      });
    } catch (e) {
      console.error("Collections fetch error:", e);
      send({
        type: "COLLECTIONS_ERROR",
        name: e.name || "FirestoreError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // 북마크 데이터 요청
  if (ev.data?.getBookmarks) {
    console.log("Getting bookmarks, collection:", ev.data.collectionId);
    try {
      let currentUser = auth.currentUser;

      if (!currentUser) {
        currentUser = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(auth.currentUser);
          }, 5000); // 3초 → 5초로 증가

          if (auth.currentUser) {
            clearTimeout(timeout);
            resolve(auth.currentUser);
            return;
          }

          const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(user);
            }
          });
        });
      }

      if (!currentUser) {
        send({
          type: "BOOKMARKS_ERROR",
          name: "AuthError",
          code: "auth/not-authenticated",
          message: "User is not authenticated. Please sign in first.",
        });
        return;
      }

      const bookmarks = await fetchBookmarks(
        currentUser.uid,
        ev.data.collectionId
      );
      console.log("Bookmarks fetched:", bookmarks.length);
      send({
        type: "BOOKMARKS_DATA",
        bookmarks: bookmarks,
        collectionId: ev.data.collectionId,
      });
    } catch (e) {
      console.error("Bookmarks fetch error:", e);
      send({
        type: "BOOKMARKS_ERROR",
        name: e.name || "FirestoreError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // 북마크 저장 요청
  if (ev.data?.saveBookmark) {
    console.log("Saving bookmark request received");
    console.log("Received bookmarkData:", ev.data.bookmarkData);
    console.log("Received collectionId:", ev.data.bookmarkData?.collectionId);
    console.log("Received idToken:", ev.data.idToken ? "Yes" : "No");

    try {
      let currentUser = auth.currentUser;

      // 현재 사용자가 없고 idToken이 있으면 세션 복원 시도
      if (!currentUser && ev.data.idToken) {
        console.log(
          "Attempting to restore Firebase Auth session with idToken..."
        );

        // idToken으로 세션 복원 시도
        try {
          // Firebase Auth에 idToken 정보가 있다면 onAuthStateChanged가 트리거될 것임
          await setPersistence(auth, browserLocalPersistence);

          // 세션 복원 대기
          currentUser = await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log("Auth state restoration timeout for bookmark save");
              resolve(auth.currentUser);
            }, 7000); // 더 긴 타임아웃

            if (auth.currentUser) {
              clearTimeout(timeout);
              resolve(auth.currentUser);
              return;
            }

            const unsubscribe = auth.onAuthStateChanged((user) => {
              console.log(
                "Auth state changed for bookmark save:",
                user ? user.uid : "null"
              );
              if (user) {
                clearTimeout(timeout);
                unsubscribe();
                resolve(user);
              }
            });
          });
        } catch (error) {
          console.error("Failed to restore session with idToken:", error);
        }
      }

      // 여전히 사용자가 없으면 일반적인 세션 복원 시도
      if (!currentUser) {
        console.log("Waiting for auth state restoration for bookmark save...");
        currentUser = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log("Auth state restoration timeout for bookmark save");
            resolve(auth.currentUser);
          }, 5000);

          if (auth.currentUser) {
            clearTimeout(timeout);
            resolve(auth.currentUser);
            return;
          }

          const unsubscribe = auth.onAuthStateChanged((user) => {
            console.log(
              "Auth state changed for bookmark save:",
              user ? user.uid : "null"
            );
            if (user) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(user);
            }
          });
        });
      }

      if (!currentUser) {
        console.error("User not authenticated for bookmark save");
        send({
          type: "BOOKMARK_SAVE_ERROR",
          name: "AuthError",
          code: "auth/not-authenticated",
          message: "User is not authenticated. Please sign in first.",
        });
        return;
      }

      console.log("Saving bookmark for authenticated user:", currentUser.uid);

      // 현재 로그인된 사용자의 ID로 북마크 데이터 업데이트
      const bookmarkData = {
        ...ev.data.bookmarkData,
        userId: currentUser.uid,
      };

      const bookmarkId = await saveBookmark(bookmarkData);
      console.log("Bookmark saved with ID:", bookmarkId);
      send({
        type: "BOOKMARK_SAVED",
        bookmarkId: bookmarkId,
      });
    } catch (e) {
      console.error("Bookmark save error:", e);
      send({
        type: "BOOKMARK_SAVE_ERROR",
        name: e.name || "FirestoreError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // 알림 설정 가져오기 요청
  if (ev.data?.getNotificationSettings) {
    console.log("Getting notification settings request received");
    try {
      let currentUser = auth.currentUser;

      if (!currentUser && ev.data.idToken) {
        currentUser = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve(auth.currentUser);
          }, 5000);

          if (auth.currentUser) {
            clearTimeout(timeout);
            resolve(auth.currentUser);
            return;
          }

          const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
              clearTimeout(timeout);
              unsubscribe();
              resolve(user);
            }
          });
        });
      }

      if (!currentUser) {
        send({
          type: "NOTIFICATION_SETTINGS_ERROR",
          name: "AuthError",
          code: "auth/not-authenticated",
          message: "User is not authenticated. Please sign in first.",
        });
        return;
      }

      // Firestore에서 알림 설정 가져오기
      const settingsRef = doc(db, "users", currentUser.uid, "settings", "main");
      const snap = await getDoc(settingsRef);

      let notificationsEnabled = true; // 기본값
      let systemNotificationsEnabled = true; // 기본값
      let bookmarkNotifications = true; // 기본값
      if (snap.exists()) {
        const data = snap.data();
        notificationsEnabled =
          data.notifications !== undefined ? data.notifications : true;
        systemNotificationsEnabled =
          data.systemNotifications !== undefined
            ? data.systemNotifications
            : notificationsEnabled;
        bookmarkNotifications =
          data.bookmarkNotifications !== undefined
            ? data.bookmarkNotifications
            : notificationsEnabled;
      }

      send({
        type: "NOTIFICATION_SETTINGS_DATA",
        notifications: notificationsEnabled,
        bookmarkNotifications: bookmarkNotifications,
        systemNotifications: systemNotificationsEnabled,
      });
    } catch (e) {
      console.error("Notification settings fetch error:", e);
      send({
        type: "NOTIFICATION_SETTINGS_ERROR",
        name: e.name || "FirestoreError",
        code: e.code,
        message: e.message,
      });
    }
  }

  // Firebase 로그아웃 요청 (Extension에서 로그아웃 시)
  if (ev.data?.logoutFirebase) {
    console.log("🔥 Firebase logout request received from extension");
    try {
      // 로그아웃 진행 중 플래그 설정
      isLoggingOut = true;
      console.log("🔥 Setting isLoggingOut = true");

      // Firebase Auth에서 로그아웃
      await auth.signOut();
      console.log("🔥 Firebase logout successful");

      // Firebase 로컬 저장소 완전 클리어
      await clearFirebaseStorage();
      console.log("🔥 Firebase storage cleared");

      // UI 업데이트 (initUI가 있는 경우)
      if (typeof updateAuthStatus === "function") {
        updateAuthStatus();
        console.log("🔥 Auth status updated after logout");
      }

      send({
        type: "LOGOUT_COMPLETE",
        message: "Firebase logout and storage clear completed",
      });
      console.log("🔥 Logout complete message sent");
    } catch (e) {
      console.error("🔥 Firebase logout error:", e);
      // 에러 발생 시에도 플래그 리셋
      isLoggingOut = false;
      send({
        type: "LOGOUT_ERROR",
        name: e.name || "FirebaseError",
        code: e.code,
        message: e.message,
      });
    }
    return;
  }
});

// 페이지 로드 완료 시 알림
console.log("SignIn popup page loaded, ready to receive messages");

// URL 쿼리 파라미터 확인
const urlParams = new URLSearchParams(window.location.search);
const source = urlParams.get("source");
const extensionId = urlParams.get("extensionId");
const isFromExtension = source === "extension" && extensionId;

console.log("=== PAGE LOAD ===");
console.log("URL:", window.location.href);
console.log("URL params - source:", source, "extensionId:", extensionId);
console.log("Is from extension:", isFromExtension);
console.log("=================");

// 안전한 signInWithPopup 래퍼 함수
async function safeSignInWithPopup() {
  try {
    // Extension 환경에서 추가 안전 장치
    if (isFromExtension) {
      console.log("Extension environment detected - using safe popup");
    }

    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    // 팝업이 닫힌 경우 더 자세한 에러 정보 제공
    const browserInfo = detectBrowser();

    if (error.code === "auth/popup-closed-by-user") {
      if (browserInfo.isInAppBrowser) {
        throw new Error(
          `로그인 팝업이 닫혔습니다. ${getBrowserCompatibilityMessage(
            browserInfo
          )}`
        );
      } else {
        throw new Error("로그인 팝업이 닫혔습니다. 다시 시도해주세요.");
      }
    } else if (error.code === "auth/popup-blocked") {
      if (browserInfo.isInAppBrowser) {
        throw new Error(
          `팝업이 차단되었습니다. ${getBrowserCompatibilityMessage(
            browserInfo
          )}`
        );
      } else {
        throw new Error(
          "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요."
        );
      }
    }
    throw error;
  }
}

function toSafeUser(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

// Firestore에 컬렉션 생성
async function createCollection(collectionData) {
  if (!collectionData.userId) {
    throw new Error("User ID is required");
  }

  try {
    const collectionsRef = collection(db, "collections");

    // 컬렉션 데이터 준비
    const newCollection = {
      userId: collectionData.userId,
      name: collectionData.name || "",
      icon: collectionData.icon || "📁",
      description: collectionData.description || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Firestore에 저장
    const docRef = await addDoc(collectionsRef, newCollection);

    return docRef.id;
  } catch (error) {
    console.error("Error creating collection:", error);
    throw error;
  }
}

// Firestore에서 컬렉션 가져오기
async function fetchCollections(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const collectionsRef = collection(db, "collections");
    const q = query(collectionsRef, where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    const collections = [];

    querySnapshot.forEach((doc) => {
      collections.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // 클라이언트 측에서 이름순으로 정렬
    collections.sort((a, b) => a.name.localeCompare(b.name));

    return collections;
  } catch (error) {
    console.error("Error fetching collections:", error);
    throw error;
  }
}

// Firestore에서 북마크 가져오기
async function fetchBookmarks(userId, collectionId = null) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const bookmarksRef = collection(db, "bookmarks");
    let q;

    if (collectionId) {
      // 특정 컬렉션의 북마크만 가져오기
      q = query(
        bookmarksRef,
        where("userId", "==", userId),
        where("collectionId", "==", collectionId)
      );
    } else {
      // 모든 북마크 가져오기
      q = query(bookmarksRef, where("userId", "==", userId));
    }

    const querySnapshot = await getDocs(q);
    const bookmarks = [];

    querySnapshot.forEach((doc) => {
      bookmarks.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // 클라이언트 측에서 정렬
    bookmarks.sort((a, b) => (a.order || 0) - (b.order || 0));

    return bookmarks;
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    throw error;
  }
}

// Firebase에 알림 생성
async function createNotification(userId, type, message, bookmarkId = null) {
  console.log("🔔 createNotification called with:", {
    userId,
    type,
    message,
    bookmarkId,
  });

  if (!userId) {
    throw new Error("User ID is required for notification");
  }

  const isBookmarkNotification =
    type === "bookmark_added" ||
    type === "bookmark_updated" ||
    type === "bookmark_deleted";

  let notificationsEnabled = true;
  let bookmarkNotificationsEnabled = true;

  try {
    const settingsRef = doc(db, "users", userId, "settings", "main");
    const snap = await getDoc(settingsRef);

    if (snap.exists()) {
      const data = snap.data();
      notificationsEnabled =
        data.notifications !== undefined ? data.notifications : true;
      bookmarkNotificationsEnabled =
        data.bookmarkNotifications !== undefined
          ? data.bookmarkNotifications
          : notificationsEnabled;
    }
  } catch (error) {
    console.error("🔔 알림 설정 확인 실패:", error);
    // 설정 확인 실패 시 기본값(활성화)으로 처리
  }

  if (!notificationsEnabled) {
    console.log("🔔 전체 알림이 비활성화되어 있어 알림을 생성하지 않습니다.");
    return null;
  }

  if (isBookmarkNotification && !bookmarkNotificationsEnabled) {
    console.log("🔔 북마크 알림이 비활성화되어 있어 알림을 생성하지 않습니다.");
    return null;
  }

  try {
    console.log("🔔 Creating notification in Firestore...");
    console.log("🔔 Firebase auth state:", {
      currentUser: auth.currentUser?.uid,
      isAuthenticated: !!auth.currentUser,
      email: auth.currentUser?.email,
    });

    const notificationsRef = collection(db, "notifications");

    const notificationData = {
      userId: userId,
      type: type,
      title: "북마크 알림",
      message: message,
      isRead: false,
      createdAt: serverTimestamp(),
      bookmarkId: bookmarkId,
      metadata: {
        source: "extension",
        timestamp: new Date().toISOString(),
      },
    };

    console.log("🔔 Notification data prepared:", notificationData);
    console.log("🔔 Attempting to add document to notifications collection...");

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log("🔔 Notification created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("🔔 Error creating notification:", error);
    console.error("🔔 Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

// Firestore에 북마크 저장
async function saveBookmark(bookmarkData) {
  if (!bookmarkData.userId) {
    throw new Error("User ID is required");
  }

  try {
    const bookmarksRef = collection(db, "bookmarks");

    // 북마크 데이터 준비 - 컬렉션 ID 처리 개선
    let collectionId = null;
    const rawCollectionId =
      bookmarkData.collection || bookmarkData.collectionId;

    if (rawCollectionId && rawCollectionId.trim() !== "") {
      collectionId = rawCollectionId.trim();
    }

    const newBookmark = {
      userId: bookmarkData.userId,
      title: bookmarkData.title || "",
      url: bookmarkData.url || "",
      description: bookmarkData.description || "",
      collection: collectionId,
      tags: bookmarkData.tags || [],
      favicon: bookmarkData.favicon || bookmarkData.favIconUrl || "",
      isFavorite: bookmarkData.isFavorite || false,
      order: bookmarkData.order || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("저장할 북마크 데이터:", {
      ...newBookmark,
      createdAt: "serverTimestamp()",
      updatedAt: "serverTimestamp()",
    });
    console.log("컬렉션 ID 최종 확인:", collectionId);

    // Firestore에 저장
    const docRef = await addDoc(bookmarksRef, newBookmark);
    try {
      const notificationId = await createNotification(
        bookmarkData.userId,
        "bookmark_added",
        `"${bookmarkData.title}" 북마크가 추가되었습니다`,
        docRef.id
      );
    } catch (notificationError) {
      // 알림 생성 실패해도 북마크 저장은 성공으로 처리
      console.error("Failed to create notification:", notificationError);
    }

    return docRef.id;
  } catch (error) {
    console.error("Error saving bookmark:", error);
    throw error;
  }
}

// ============================================
// UI 제어 코드
// ============================================

// DOM이 로드될 때까지 대기
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  initUI();
}

function initUI() {
  console.log("Initializing UI...");

  // 브라우저 호환성 검사 및 경고 표시
  const browserInfo = detectBrowser();
  const browserWarningEl = document.getElementById("browserWarning");
  const browserWarningContentEl = document.getElementById(
    "browserWarningContent"
  );
  const browserWarningTipEl = document.getElementById("browserWarningTip");

  if (browserWarningEl && browserWarningContentEl) {
    if (!browserInfo.isCompatible) {
      const message = getBrowserCompatibilityMessage(browserInfo);
      browserWarningContentEl.textContent = message;
      browserWarningEl.classList.remove("hidden");

      // 인앱 브라우저인 경우 추가 팁 표시
      if (browserInfo.isInAppBrowser && browserWarningTipEl) {
        browserWarningTipEl.style.display = "block";
      }
    }
  }

  // DOM 요소
  const authStatusEl = document.getElementById("authStatus");
  const userInfoEl = document.getElementById("userInfo");
  const userEmailEl = document.getElementById("userEmail");
  const loggedOutButtonsEl = document.getElementById("loggedOutButtons");
  const loggedInButtonsEl = document.getElementById("loggedInButtons");
  const loginBtn = document.getElementById("loginBtn");
  const dashboardBtn = document.getElementById("dashboardBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const closeTabBtn = document.getElementById("closeTabBtn");
  const emailLoginSection = document.getElementById("emailLoginSection");
  const signupSection = document.getElementById("signupSection");
  const emailLoginForm = document.getElementById("emailLoginForm");
  const signupForm = document.getElementById("signupForm");
  const switchToSignupBtn = document.getElementById("switchToSignupBtn");
  const switchToLoginBtn = document.getElementById("switchToLoginBtn");
  const toggleLogsBtn = document.getElementById("toggleLogsBtn");
  const debugContentEl = document.getElementById("debugContent");
  const debugLogsEl = document.getElementById("debugLogs");
  const debugControlsEl = document.getElementById("debugControls");
  const clearLogsBtn = document.getElementById("clearLogsBtn");

  if (!authStatusEl || !loginBtn) {
    console.error("UI elements not found!");
    return;
  }

  let logsVisible = false;

  // 디버그 로그 함수
  function addLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement("div");
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    debugLogsEl.appendChild(logEntry);
    debugLogsEl.scrollTop = debugLogsEl.scrollHeight;
    console.log(message);
  }

  // 로그인 상태 업데이트
  function updateAuthStatus() {
    const currentUser = auth.currentUser;

    if (currentUser) {
      authStatusEl.className = "auth-status status-logged-in";
      authStatusEl.innerHTML = `<i data-lucide="check-circle" style="width: 12px; height: 12px;"></i> <span class="auth-status-text">${
        translations[currentLanguage]?.loggedIn || translations.ko.loggedIn
      }</span>`;
      userEmailEl.textContent = `${currentUser.email || "N/A"}`;
      userInfoEl.style.display = "block";
      loggedOutButtonsEl.classList.add("hidden");
      loggedInButtonsEl.classList.remove("hidden");
      emailLoginSection.classList.add("hidden");
      signupSection.classList.add("hidden");
      addLog(`로그인 확인: ${currentUser.email}`, "success");

      // Lucide 아이콘 재초기화
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
    } else {
      authStatusEl.className = "auth-status status-logged-out";
      authStatusEl.innerHTML = `<i data-lucide="x-circle" style="width: 12px; height: 12px;"></i> <span class="auth-status-text">${
        translations[currentLanguage]?.loggedOut || translations.ko.loggedOut
      }</span>`;
      userInfoEl.style.display = "none";
      loggedOutButtonsEl.classList.remove("hidden");
      loggedInButtonsEl.classList.add("hidden");
      emailLoginSection.classList.remove("hidden");
      signupSection.classList.add("hidden");
      addLog("로그인되지 않음", "error");

      // Lucide 아이콘 재초기화
      if (typeof lucide !== "undefined") {
        lucide.createIcons();
      }
    }
  }

  // 로그 토글
  toggleLogsBtn.addEventListener("click", () => {
    logsVisible = !logsVisible;
    if (logsVisible) {
      debugContentEl.classList.add("show");
      toggleLogsBtn.textContent = "숨기기";
    } else {
      debugContentEl.classList.remove("show");
      toggleLogsBtn.textContent = "보기";
    }
  });

  // 로그인 버튼 클릭
  loginBtn.addEventListener("click", async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      // 이미 로그인된 경우 (이 경우는 거의 없음)
      updateAuthStatus();
      return;
    }

    // 로그인
    try {
      addLog("Google 로그인 시작...", "info");

      // Extension에서 온 경우 안내 메시지 추가
      if (isFromExtension) {
        addLog("확장 프로그램에서 Google 로그인을 진행합니다...", "info");
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = `<div class="loading-spinner"></div> 로그인 중...`;

      const result = await safeSignInWithPopup();
      addLog(`로그인 성공: ${result.user.email}`, "success");

      updateAuthStatus();

      // Extension에서 왔다면 로그인 정보 전달
      console.log(
        "Check redirect - source:",
        source,
        "extensionId:",
        extensionId
      );

      if (source === "extension" && extensionId) {
        await handleExtensionLogin(result.user);
      } else {
        console.log("Not redirecting - source or extensionId missing");
        console.log("Current URL:", window.location.href);
      }
    } catch (error) {
      console.error("Login error:", error);
      const browserInfo = detectBrowser();
      let errorMessage = error.message;

      // 브라우저 호환성을 고려한 에러 메시지 개선
      if (error.code === "auth/popup-closed-by-user") {
        if (browserInfo.isInAppBrowser) {
          errorMessage = `팝업이 닫혔습니다. ${getBrowserCompatibilityMessage(
            browserInfo
          )}`;
        } else {
          errorMessage = "로그인 팝업이 닫혔습니다. 다시 시도해주세요.";
        }
      } else if (error.code === "auth/popup-blocked") {
        if (browserInfo.isInAppBrowser) {
          errorMessage = `팝업이 차단되었습니다. ${getBrowserCompatibilityMessage(
            browserInfo
          )}`;
        } else {
          errorMessage =
            "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
        }
      } else if (error.code === "auth/network-request-failed") {
        if (browserInfo.isInAppBrowser) {
          errorMessage = `네트워크 오류가 발생했습니다. ${getBrowserCompatibilityMessage(
            browserInfo
          )}`;
        } else {
          errorMessage =
            "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
        }
      } else if (browserInfo.isInAppBrowser) {
        errorMessage = `로그인 실패: ${
          error.message
        }. ${getBrowserCompatibilityMessage(browserInfo)}`;
      }

      addLog(`로그인 실패: ${errorMessage}`, "error");

      // Extension에서 온 경우 특별한 안내
      if (isFromExtension && error.code === "auth/popup-closed-by-user") {
        addLog("팝업이 닫혔습니다. 다시 시도해주세요.", "warning");
      }
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google 로그인
      `;
    }
  });

  // 대시보드 버튼 클릭
  dashboardBtn.addEventListener("click", () => {
    addLog("대시보드로 이동 중...", "info");
    window.open("https://bookmarkhub-5ea6c.web.app/", "_blank");
  });

  // 로그아웃 버튼 클릭
  logoutBtn.addEventListener("click", async () => {
    try {
      addLog("로그아웃 중...", "info");
      // 로그아웃 진행 중 플래그 설정
      isLoggingOut = true;
      console.log("Setting isLoggingOut = true (manual logout)");

      await auth.signOut();
      addLog("Firebase 로그아웃 완료", "success");

      // Firebase 로컬 저장소 완전 클리어
      await clearFirebaseStorage();
      addLog("로컬 저장소 클리어 완료", "success");

      updateAuthStatus();

      // Extension에서 왔다면 로그아웃 알림
      if (source === "extension" && extensionId) {
        try {
          await chrome.runtime.sendMessage(extensionId, {
            type: "LOGOUT_SUCCESS",
          });
          addLog("Extension에 로그아웃 알림 전송", "success");
        } catch (error) {
          addLog(`Extension 통신 실패: ${error.message}`, "error");
        }
      }
    } catch (error) {
      addLog(`로그아웃 실패: ${error.message}`, "error");
      // 에러 발생 시에도 플래그 리셋
      isLoggingOut = false;
    }
  });

  // 탭 닫기 버튼 클릭
  closeTabBtn.addEventListener("click", () => {
    addLog("탭을 닫는 중...", "info");

    // window.close() 시도
    window.close();

    // window.close()가 작동하지 않을 수 있음을 안내 (짧은 지연 후)
    setTimeout(() => {
      addLog("탭을 수동으로 닫아주세요. (Ctrl+W 또는 탭의 X 버튼)", "warning");
    }, 500);
  });

  // 로그 지우기 버튼
  clearLogsBtn.addEventListener("click", () => {
    debugLogsEl.innerHTML = "";
    addLog("로그 초기화됨", "info");
  });

  // 이메일 로그인 폼 제출
  emailLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      addLog("이메일과 비밀번호를 입력해주세요", "error");
      return;
    }

    try {
      addLog("이메일 로그인 시도 중...", "info");
      const emailLoginBtn = document.getElementById("emailLoginBtn");
      emailLoginBtn.disabled = true;
      emailLoginBtn.innerHTML = `<div class="loading-spinner"></div> 로그인 중...`;

      const result = await signInWithEmailAndPassword(auth, email, password);
      addLog(`이메일 로그인 성공: ${result.user.email}`, "success");

      updateAuthStatus();

      // Extension에서 왔다면 로그인 정보 전달
      if (source === "extension" && extensionId) {
        await handleExtensionLogin(result.user);
      }
    } catch (error) {
      console.error("Email login error:", error);
      let errorMessage = "로그인에 실패했습니다.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "등록되지 않은 이메일입니다.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "비밀번호가 올바르지 않습니다.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "올바른 이메일 형식이 아닙니다.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.";
      }

      addLog(`이메일 로그인 실패: ${errorMessage}`, "error");
    } finally {
      const emailLoginBtn = document.getElementById("emailLoginBtn");
      emailLoginBtn.disabled = false;
      emailLoginBtn.innerHTML = "📧 이메일로 로그인";
    }
  });

  // 회원가입 폼 제출
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const displayName = formData.get("displayName");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!displayName || !email || !password || !confirmPassword) {
      addLog("모든 필드를 입력해주세요", "error");
      return;
    }

    if (password !== confirmPassword) {
      addLog("비밀번호가 일치하지 않습니다", "error");
      return;
    }

    if (password.length < 6) {
      addLog("비밀번호는 최소 6자 이상이어야 합니다", "error");
      return;
    }

    try {
      addLog("회원가입 시도 중...", "info");
      const signupBtn = document.getElementById("signupBtn");
      signupBtn.disabled = true;
      signupBtn.innerHTML = `<div class="loading-spinner"></div> 가입 중...`;

      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 사용자명 업데이트
      await updateProfile(result.user, {
        displayName: displayName,
      });

      addLog(`회원가입 성공: ${result.user.email}`, "success");

      updateAuthStatus();

      // Extension에서 왔다면 로그인 정보 전달
      if (source === "extension" && extensionId) {
        await handleExtensionLogin(result.user);
      }
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "회원가입에 실패했습니다.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "이미 가입된 이메일입니다.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "비밀번호는 최소 6자 이상이어야 합니다.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "올바른 이메일 형식이 아닙니다.";
      }

      addLog(`회원가입 실패: ${errorMessage}`, "error");
    } finally {
      const signupBtn = document.getElementById("signupBtn");
      signupBtn.disabled = false;
      signupBtn.innerHTML = "✍️ 회원가입";
    }
  });

  // 회원가입 모드 전환
  switchToSignupBtn.addEventListener("click", () => {
    emailLoginSection.classList.add("hidden");
    signupSection.classList.remove("hidden");
    addLog("회원가입 모드로 전환", "info");
  });

  // 로그인 모드 전환
  switchToLoginBtn.addEventListener("click", () => {
    signupSection.classList.add("hidden");
    emailLoginSection.classList.remove("hidden");
    addLog("로그인 모드로 전환", "info");
  });

  // Extension 로그인 처리 함수
  async function handleExtensionLogin(user) {
    addLog("Extension에 로그인 정보 전달 중...", "info");

    try {
      // ID 토큰 가져오기
      const idToken = await user.getIdToken();
      console.log("ID token obtained for extension");

      // 컬렉션 가져오기
      addLog("컬렉션 불러오는 중...", "info");
      const collections = await fetchCollections(user.uid);
      console.log("Collections fetched for extension:", collections.length);

      // Extension에 로그인 정보 및 컬렉션 전달
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      console.log(
        "Sending login info and collections to extension:",
        extensionId
      );
      console.log("Collections to send:", collections);

      const response = await chrome.runtime.sendMessage(extensionId, {
        type: "LOGIN_SUCCESS",
        user: userData,
        idToken: idToken,
        collections: collections,
      });

      console.log("Extension 응답:", response);
      addLog(
        `✅ 로그인 정보 및 ${collections.length}개의 컬렉션이 확장 프로그램에 전달되었습니다!`,
        "success"
      );

      // 성공 후 현재 페이지에서 로그인 상태 유지 (리다이렉트 없음)
      addLog("로그인 완료! 이 페이지에서 계속 사용할 수 있습니다.", "success");

      // Extension에서 열린 경우 탭 닫기 안내만 제공 (자동 닫기 제거)
      if (isFromExtension) {
        addLog(
          "로그인이 완료되었습니다. 우측 상단의 '탭 닫기' 버튼을 눌러 탭을 닫을 수 있습니다.",
          "info"
        );
      }
    } catch (error) {
      console.error("Extension 통신 오류:", error);
      addLog(`❌ Extension 통신 실패: ${error.message}`, "error");
    }
  }

  // 초기화
  addLog("북마클 로그인 페이지 초기화 완료", "success");

  // 인증 상태 모니터링
  let hasRedirected = false; // 중복 리다이렉트 방지

  auth.onAuthStateChanged(async (user) => {
    console.log(
      "onAuthStateChanged - user:",
      user ? user.email : "null",
      "source:",
      source,
      "extensionId:",
      extensionId,
      "hasRedirected:",
      hasRedirected,
      "isLoggingOut:",
      isLoggingOut
    );
    addLog(`인증 상태 변경: ${user ? user.email : "로그아웃"}`, "info");
    updateAuthStatus();

    // 로그아웃 진행 중이면 자동 로그인 로직 건너뛰기
    if (isLoggingOut) {
      console.log("Logout in progress - skipping auto login logic");
      if (!user) {
        // 로그아웃 완료되면 플래그 리셋
        isLoggingOut = false;
        hasRedirected = false;
        console.log("Logout completed - flags reset");
      }
      return;
    }

    // Extension에서 왔는데 이미 로그인되어 있으면 정보 전달
    if (user && source === "extension" && extensionId && !hasRedirected) {
      hasRedirected = true;
      console.log("Already logged in - sending info to extension immediately");
      addLog("이미 로그인되어 있음 - Extension에 정보 전달", "info");

      try {
        await handleExtensionLogin(user);
      } catch (error) {
        console.error("Extension 통신 오류 (auto):", error);
        addLog(`❌ Extension 통신 실패: ${error.message}`, "error");
      }
    }
  });

  // 초기 상태 표시
  updateAuthStatus();
}
