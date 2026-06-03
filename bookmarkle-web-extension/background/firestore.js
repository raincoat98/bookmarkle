import { FIREBASE_PROJECT_ID } from "./constants.js";
import {
  refreshIdTokenWithRefreshToken,
  getRefreshIdTokenFromWeb,
} from "./auth.js";
import { setCurrentIdToken } from "./state.js";
import { parseErrorResponse } from "./utils.js";

async function refreshToken() {
  console.log("🔐 401 오류 감지, 토큰 갱신 후 재시도");
  let refreshedToken = await refreshIdTokenWithRefreshToken();
  if (!refreshedToken) {
    console.log("⚠️ Refresh Token 갱신 실패, 웹 탭에서 요청 시도");
    refreshedToken = await getRefreshIdTokenFromWeb();
  }
  if (!refreshedToken) {
    throw new Error("토큰 갱신 실패. 다시 로그인해주세요.");
  }
  setCurrentIdToken(refreshedToken);
  console.log("✅ 토큰 갱신 완료, API 재시도");
  return refreshedToken;
}

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
            op: operator,
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

    if (!response.ok && response.status === 401 && retryOnAuthError) {
      const refreshedToken = await refreshToken();
      return runFirestoreQuery(collectionId, fieldPath, operator, value, refreshedToken, false);
    }

    if (!response.ok) {
      throw new Error(`Firestore API 오류: ${await parseErrorResponse(response)}`);
    }

    return response.json();
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

    const firestoreData = {};
    for (const [key, value] of Object.entries(documentData)) {
      if (value === undefined) continue;

      if (value === null) {
        firestoreData[key] = { nullValue: null };
      } else if (value instanceof Date) {
        firestoreData[key] = { timestampValue: value.toISOString() };
      } else if (typeof value === "string") {
        firestoreData[key] = { stringValue: value };
      } else if (typeof value === "number") {
        firestoreData[key] = Number.isInteger(value)
          ? { integerValue: value.toString() }
          : { doubleValue: value };
      } else if (typeof value === "boolean") {
        firestoreData[key] = { booleanValue: value };
      } else if (value instanceof Array) {
        firestoreData[key] = {
          arrayValue: { values: value.map((v) => ({ stringValue: v })) },
        };
      } else if (value instanceof Object && value.seconds !== undefined) {
        firestoreData[key] = {
          timestampValue: new Date(value.seconds * 1000).toISOString(),
        };
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: firestoreData }),
    });

    if (!response.ok && response.status === 401 && retryOnAuthError) {
      const refreshedToken = await refreshToken();
      return addFirestoreDocument(collectionId, documentData, refreshedToken, false);
    }

    if (!response.ok) {
      throw new Error(`Firestore API 오류: ${await parseErrorResponse(response)}`);
    }

    return response.json();
  } catch (error) {
    console.error("❌ Firestore 문서 추가 실패:", error);
    throw error;
  }
}
