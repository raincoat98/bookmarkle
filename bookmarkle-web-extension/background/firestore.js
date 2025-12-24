import { FIREBASE_PROJECT_ID } from "./constants.js";
import {
  refreshIdTokenWithRefreshToken,
  getRefreshIdTokenFromWeb,
} from "./auth.js";
import { setCurrentIdToken } from "./state.js";

// Firestore 쿼리 실행 (WHERE 절) - 토큰 만료 시 자동 갱신 및 재시도
export async function runFirestoreQuery(
  collectionId,
  fieldPath,
  operator,
  value,
  idToken,
  retryOnAuthError = true
) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

    const body = {
      structuredQuery: {
        from: [{ collectionId: collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: fieldPath },
            op: operator, // "EQUAL", "GREATER_THAN", etc.
            value: { stringValue: value },
          },
        },
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    // 401 Unauthorized 오류 발생 시 토큰 갱신 후 재시도
    if (!response.ok && response.status === 401 && retryOnAuthError) {
      console.log("🔐 401 오류 감지, 토큰 갱신 후 재시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        setCurrentIdToken(refreshedToken);
        console.log("✅ 토큰 갱신 완료, API 재시도");
        // 재시도 (무한 루프 방지를 위해 retryOnAuthError를 false로)
        return runFirestoreQuery(
          collectionId,
          fieldPath,
          operator,
          value,
          refreshedToken,
          false
        );
      } else {
        throw new Error("토큰 갱신 실패. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firestore API 오류: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Firestore 쿼리 실행 실패:", error);
    throw error;
  }
}

// Firestore 문서 추가 - 토큰 만료 시 자동 갱신 및 재시도
export async function addFirestoreDocument(
  collectionId,
  documentData,
  idToken,
  retryOnAuthError = true
) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionId}`;

    // Firestore API용 데이터 포맷 변환
    const firestoreData = {};
    for (const [key, value] of Object.entries(documentData)) {
      // undefined 값은 건너뛰기
      if (value === undefined) {
        continue;
      }

      if (value === null) {
        firestoreData[key] = { nullValue: null };
      } else if (value instanceof Date) {
        // Date 객체를 Firestore Timestamp로 변환
        firestoreData[key] = {
          timestampValue: value.toISOString(),
        };
      } else if (typeof value === "string") {
        // 빈 문자열도 명시적으로 포함 (description 필드 등)
        // Firestore는 빈 문자열을 저장할 수 있음
        firestoreData[key] = { stringValue: value };
      } else if (typeof value === "number") {
        firestoreData[key] = { integerValue: value.toString() };
      } else if (typeof value === "boolean") {
        firestoreData[key] = { booleanValue: value };
      } else if (value instanceof Array) {
        firestoreData[key] = {
          arrayValue: {
            values: value.map((v) => ({ stringValue: v })),
          },
        };
      } else if (value instanceof Object && value.seconds !== undefined) {
        // Timestamp 처리
        firestoreData[key] = {
          timestampValue: new Date(value.seconds * 1000).toISOString(),
        };
      }
    }

    // 디버깅: description 필드가 포함되었는지 확인
    if (
      collectionId === "collections" &&
      documentData.description !== undefined
    ) {
      console.log("📝 description 필드 포함 여부:", {
        inDocumentData: "description" in documentData,
        value: documentData.description,
        inFirestoreData: "description" in firestoreData,
        firestoreValue: firestoreData.description,
      });
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: firestoreData,
      }),
    });

    // 401 Unauthorized 오류 발생 시 토큰 갱신 후 재시도
    if (!response.ok && response.status === 401 && retryOnAuthError) {
      console.log("🔐 401 오류 감지, 토큰 갱신 후 재시도");

      // 1단계: Refresh Token으로 갱신
      let refreshedToken = await refreshIdTokenWithRefreshToken();

      // 2단계: 실패하면 웹 탭에서 요청
      if (!refreshedToken) {
        console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
        refreshedToken = await getRefreshIdTokenFromWeb();
      }

      if (refreshedToken) {
        setCurrentIdToken(refreshedToken);
        console.log("✅ 토큰 갱신 완료, API 재시도");
        // 재시도 (무한 루프 방지를 위해 retryOnAuthError를 false로)
        return addFirestoreDocument(
          collectionId,
          documentData,
          refreshedToken,
          false
        );
      } else {
        throw new Error("토큰 갱신 실패. 다시 로그인해주세요.");
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Firestore API 오류: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Firestore 문서 추가 실패:", error);
    throw error;
  }
}
