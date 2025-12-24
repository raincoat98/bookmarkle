import {
  restoreUserInfo,
  refreshIdTokenWithRefreshToken,
  getRefreshIdTokenFromWeb,
} from "./auth.js";
import { currentUser, currentIdToken, setCurrentIdToken } from "./state.js";
import { runFirestoreQuery, addFirestoreDocument } from "./firestore.js";

// 컬렉션 목록 요청 처리
export async function handleFetchCollections(sendResponse) {
  try {
    console.log("📂 컬렉션 목록 요청 처리 시작");

    // idToken이 메모리에 없으면 storage에서 복원 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    // 토큰이 없거나 만료되었을 가능성이 있으면 갱신 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 없음, 토큰 갱신 시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        setCurrentIdToken(refreshedToken);
        console.log("✅ 토큰 갱신 완료");
      }
    }

    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.error("❌ 사용자 정보 또는 인증 토큰 없음:", {
        hasUser: !!currentUser,
        hasUid: !!currentUser?.uid,
        hasIdToken: !!currentIdToken,
      });
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    console.log("✅ 사용자 정보 확인 완료, Firestore REST API 호출");

    // Firestore REST API로 컬렉션 목록 조회
    try {
      const queryResult = await runFirestoreQuery(
        "collections",
        "userId",
        "EQUAL",
        currentUser.uid,
        currentIdToken
      );

      // 응답에서 컬렉션 목록 추출 및 포맷팅
      const collections = queryResult
        .filter((item) => item.document)
        .map((item) => {
          const doc = item.document;
          const fields = doc.fields || {};
          return {
            id: doc.name.split("/").pop(), // 문서 ID 추출
            name: fields.name?.stringValue || "컬렉션",
            icon: fields.icon?.stringValue || "",
            parentId: fields.parentId?.stringValue || null,
            isPinned: fields.isPinned?.booleanValue || false,
          };
        })
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return a.name.localeCompare(b.name);
        });

      console.log(`✅ 컬렉션 목록 조회 완료: ${collections.length}개`);
      sendResponse({
        success: true,
        collections: collections,
      });
    } catch (error) {
      console.error("❌ Firestore 쿼리 실패:", error);
      sendResponse({
        success: false,
        error:
          error.message || "컬렉션 목록을 가져오는 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    console.error("❌ handleFetchCollections 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "컬렉션 목록을 가져오는 중 오류가 발생했습니다.",
    });
  }
}

// 컬렉션 생성 처리
export async function handleCreateCollection(request, sendResponse) {
  try {
    console.log("➕ 컬렉션 생성 요청 처리 시작");

    // idToken이 메모리에 없으면 storage에서 복원 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 메모리에 없음, storage에서 복원 시도");
      await restoreUserInfo();
    }

    // 토큰이 없거나 만료되었을 가능성이 있으면 갱신 시도
    if (!currentIdToken) {
      console.log("⚠️ idToken이 없음, 토큰 갱신 시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        setCurrentIdToken(refreshedToken);
        console.log("✅ 토큰 갱신 완료");
      }
    }

    if (!currentUser || !currentUser.uid || !currentIdToken) {
      console.error("❌ 사용자 정보 또는 인증 토큰 없음");
      sendResponse({
        success: false,
        error: "확장 프로그램에서 먼저 로그인해주세요.",
      });
      return;
    }

    const collectionData = request.collectionData;
    if (
      !collectionData ||
      !collectionData.name ||
      !collectionData.name.trim()
    ) {
      sendResponse({
        success: false,
        error: "컬렉션 이름이 필요합니다.",
      });
      return;
    }

    console.log("✅ 사용자 정보 확인 완료, Firestore REST API 호출");

    // Firestore REST API로 컬렉션 생성
    try {
      const now = new Date();
      const collectionDocument = {
        name: collectionData.name.trim(),
        userId: currentUser.uid,
        icon: collectionData.icon || "Folder",
        description: "",
        parentId: collectionData.parentId || null,
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };

      console.log(
        "📝 컬렉션 데이터:",
        JSON.stringify(collectionDocument, null, 2)
      );

      const result = await addFirestoreDocument(
        "collections",
        collectionDocument,
        currentIdToken
      );

      // 응답에서 문서 ID 추출
      const collectionId = result.name?.split("/").pop() || null;

      console.log(`✅ 컬렉션 생성 완료, ID: ${collectionId}`);
      sendResponse({
        success: true,
        collectionId: collectionId,
      });
    } catch (error) {
      console.error("❌ Firestore 컬렉션 생성 실패:", error);
      sendResponse({
        success: false,
        error: error.message || "컬렉션 생성 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    console.error("❌ handleCreateCollection 오류:", error);
    sendResponse({
      success: false,
      error: error.message || "컬렉션 생성 중 오류가 발생했습니다.",
    });
  }
}

