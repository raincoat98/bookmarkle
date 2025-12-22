// Offscreen Document - Firebase 초기화 및 관리

// Firebase Config (build-config.js에서 주입됨)
const FIREBASE_CONFIG = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "FIREBASE_AUTH_DOMAIN_PLACEHOLDER",
  projectId: "FIREBASE_PROJECT_ID_PLACEHOLDER",
  storageBucket: "FIREBASE_STORAGE_BUCKET_PLACEHOLDER",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER",
  appId: "FIREBASE_APP_ID_PLACEHOLDER",
};

let app = null;
let auth = null;
let db = null;

// Firebase 초기화
function initializeFirebase() {
  if (app) {
    console.log("✅ Firebase 이미 초기화됨");
    return;
  }

  try {
    app = firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("✅ Firebase 초기화 완료 (Offscreen)");
  } catch (error) {
    console.error("❌ Firebase 초기화 실패:", error);
  }
}

// Firebase Auth 인증 확인 및 재인증
// 주의: Firebase idToken은 Google OAuth credential로 사용할 수 없습니다.
// Extension의 offscreen document는 독립적인 컨텍스트이므로 Firebase Auth 세션이 공유되지 않습니다.
// Firestore 규칙에서 인증 없이도 userId로 필터링된 경우 허용하도록 설정되어 있으므로,
// 이 함수는 더 이상 사용되지 않습니다.
// async function ensureAuthenticated(user, idToken) {
//   // 이 함수는 사용되지 않음 - Firestore 규칙에서 인증 없이도 허용
//   return { success: true };
// }

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_DATA_COUNT") {
    handleGetDataCount(request, sendResponse);
    return true; // 비동기 응답
  }

  if (request.type === "SAVE_BOOKMARK") {
    handleSaveBookmark(request, sendResponse);
    return true; // 비동기 응답
  }

  return false;
});

// 컬렉션 개수 가져오기
async function handleGetDataCount(request, sendResponse) {
  try {
    console.log("📊 Offscreen에서 컬렉션 개수 조회 시작...");

    // Firebase 초기화
    if (!app) {
      initializeFirebase();
    }

    // Background Script에서 전달받은 사용자 정보 확인
    const user = request.user;

    if (!user || !user.uid) {
      sendResponse({
        success: false,
        error: "사용자 정보가 없습니다.",
      });
      return;
    }

    console.log(
      "ℹ️ Firestore 규칙의 userId 필터링으로 보안 처리 (인증 불필요)"
    );

    // Firestore에서 컬렉션 개수 조회 (userId로 필터링)
    // Firestore 규칙에서 list 권한이 있으면 인증된 사용자 모두 쿼리 가능
    // where 절로 userId 필터링하므로 보안 문제 없음
    const collectionsRef = db.collection("collections");
    const querySnapshot = await collectionsRef
      .where("userId", "==", user.uid)
      .get();

    const count = querySnapshot.size;
    console.log("✅ 컬렉션 개수 조회 완료:", count);

    sendResponse({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error("❌ Offscreen에서 컬렉션 조회 실패:", error);

    // 권한 오류인 경우 더 자세한 정보 제공
    if (
      error.code === "permission-denied" ||
      error.message?.includes("Missing or insufficient permissions")
    ) {
      console.error("❌ Firestore 권한 오류 - 인증이 필요합니다.");
      sendResponse({
        success: false,
        error:
          "Firestore 권한 오류: 인증이 필요합니다. 로그인 상태를 확인해주세요.",
      });
    } else {
      sendResponse({
        success: false,
        error:
          error.message || "컬렉션 개수를 가져오는 중 오류가 발생했습니다.",
      });
    }
  }
}

// 북마크 저장
async function handleSaveBookmark(request, sendResponse) {
  try {
    console.log("📚 Offscreen에서 북마크 저장 시작...");
    console.log("📋 요청 데이터:", {
      hasUser: !!request.user,
      hasBookmarkData: !!request.bookmarkData,
    });

    // Firebase 초기화
    if (!app) {
      initializeFirebase();
    }

    // 사용자 정보 및 북마크 데이터 확인
    const user = request.user;
    const bookmarkData = request.bookmarkData;

    if (!user || !user.uid) {
      sendResponse({
        success: false,
        error: "사용자 정보가 없습니다.",
      });
      return;
    }

    if (!bookmarkData || !bookmarkData.title || !bookmarkData.url) {
      sendResponse({
        success: false,
        error: "북마크 데이터가 유효하지 않습니다.",
      });
      return;
    }

    // 인증 없이 Firestore 규칙의 userId 필터링으로 보안 처리
    console.log(
      "ℹ️ Firestore 규칙의 userId 검증으로 보안 처리 (인증 불필요)"
    );

    // Firestore에 북마크 추가
    const now = new Date();
    const newBookmark = {
      title: bookmarkData.title,
      url: bookmarkData.url,
      description: "",
      favicon: bookmarkData.favicon || "",
      collection: null,
      order: 0,
      userId: user.uid,
      createdAt: firebase.firestore.Timestamp.fromDate(now),
      updatedAt: firebase.firestore.Timestamp.fromDate(now),
      tags: [],
      isFavorite: false,
    };

    console.log("📝 Firestore에 북마크 추가 중...", newBookmark);

    const bookmarksRef = db.collection("bookmarks");
    const docRef = await bookmarksRef.add(newBookmark);

    console.log("✅ 북마크 저장 완료, ID:", docRef.id);

    const response = {
      success: true,
      bookmarkId: docRef.id,
    };
    console.log("📤 응답 전송:", response);
    sendResponse(response);
  } catch (error) {
    console.error("❌ Offscreen에서 북마크 저장 실패:", error);
    console.error("❌ 에러 상세:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });

    // 권한 오류인 경우 더 자세한 정보 제공
    let errorResponse;
    if (
      error.code === "permission-denied" ||
      error.message?.includes("Missing or insufficient permissions")
    ) {
      console.error("❌ Firestore 권한 오류 - 인증이 필요합니다.");
      errorResponse = {
        success: false,
        error:
          "Firestore 권한 오류: 인증이 필요합니다. 로그인 상태를 확인해주세요.",
      };
    } else if (error.code === "unauthenticated") {
      errorResponse = {
        success: false,
        error: "인증 정보가 만료되었습니다. 다시 로그인해주세요.",
      };
    } else {
      errorResponse = {
        success: false,
        error: error.message || "북마크 저장 중 오류가 발생했습니다.",
      };
    }

    console.log("📤 에러 응답 전송:", errorResponse);
    sendResponse(errorResponse);
  }
}

// 페이지 로드 시 Firebase 초기화
console.log("🔄 Offscreen Document 로드됨");
initializeFirebase();
