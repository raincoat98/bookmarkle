// Extension 빌드 후처리 스크립트
// Vite 빌드 후 환경 변수를 주입합니다

import fs from "fs";
import path from "path";
import { config } from "dotenv";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, ".env") });

const distDir = path.join(__dirname, "dist");

// 환경 변수에서 값 가져오기
const signinPopupUrl = process.env.SIGNIN_POPUP_URL || " ";
const firebaseApiKey =
  process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
const firebaseAuthDomain =
  process.env.FIREBASE_AUTH_DOMAIN ||
  process.env.VITE_FIREBASE_AUTH_DOMAIN ||
  "";
const firebaseProjectId =
  process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
const firebaseStorageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  "";
const firebaseMessagingSenderId =
  process.env.FIREBASE_MESSAGING_SENDER_ID ||
  process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
  "";
const firebaseAppId =
  process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "";

console.log("📝 환경 변수 주입 중...\n");

// manifest.json 확인 및 아이콘 처리
const manifestPath = path.join(distDir, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];
  const iconsDir = path.join(__dirname, "icons");
  const missingIcons = iconFiles.filter(
    (icon) => !fs.existsSync(path.join(iconsDir, icon))
  );

  if (missingIcons.length > 0) {
    delete manifest.icons;
    if (manifest.action) {
      delete manifest.action.default_icon;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(
      "✅ 아이콘 파일 없음 - manifest.json에서 아이콘 참조 제거 완료"
    );
  }
}

// background.js에 SIGNIN_POPUP_URL 및 FIREBASE_PROJECT_ID 주입
const backgroundPath = path.join(distDir, "background.js");
if (fs.existsSync(backgroundPath)) {
  const signinPopupUrlWithParam =
    signinPopupUrl +
    (signinPopupUrl.includes("?") ? "&" : "?") +
    "extension=true";

  let content = fs.readFileSync(backgroundPath, "utf8");

  // preload-helper 관련 코드 제거
  // Vite가 생성한 preload-helper import 문 제거 (만약 남아있다면)
  const preloadHelperImportPattern =
    /import\s*{\s*_\s*as\s+\w+\s*}\s*from\s*["']\.\/preload-helper-[^"']+["'];?\s*/g;
  content = content.replace(preloadHelperImportPattern, "");

  // export 문 제거 (preload-helper에서 남은 export 문들)
  const exportPattern = /export\s*{\s*\w+\s*as\s+_\s*}\s*;?\s*/g;
  content = content.replace(exportPattern, "");

  // preload-helper 파일 삭제 (존재하는 경우)
  try {
    const helperFiles = fs
      .readdirSync(distDir)
      .filter(
        (file) => file.startsWith("preload-helper") && file.endsWith(".js")
      );
    helperFiles.forEach((file) => {
      try {
        fs.unlinkSync(path.join(distDir, file));
        console.log(`✅ preload-helper 파일 제거: ${file}`);
      } catch (err) {
        console.warn(`⚠️ preload-helper 파일 삭제 실패: ${file}`, err.message);
      }
    });
  } catch (err) {
    // distDir이 없거나 읽을 수 없으면 무시
  }

  // 난독화 후에도 작동하도록 문자열만 찾아서 교체
  content = content.replace(
    /"SIGNIN_POPUP_URL_PLACEHOLDER"/g,
    `"${signinPopupUrlWithParam}"`
  );
  content = content.replace(
    /"FIREBASE_PROJECT_ID_PLACEHOLDER"/g,
    `"${firebaseProjectId}"`
  );
  // FIREBASE_API_KEY 상수는 난독화에서 제외되므로 직접 교체 가능
  const beforeReplace = content.includes("FIREBASE_API_KEY_PLACEHOLDER");
  content = content.replace(
    /"FIREBASE_API_KEY_PLACEHOLDER"/g,
    `"${firebaseApiKey}"`
  );
  const afterReplace = content.includes("FIREBASE_API_KEY_PLACEHOLDER");

  if (beforeReplace && afterReplace) {
    console.warn("⚠️ FIREBASE_API_KEY_PLACEHOLDER가 교체되지 않았습니다!");
  }

  fs.writeFileSync(backgroundPath, content, "utf8");
  console.log("✅ background.js 환경 변수 주입 완료");
  console.log(`   SIGNIN_POPUP_URL: ${signinPopupUrlWithParam}`);
  console.log(`   FIREBASE_PROJECT_ID: ${firebaseProjectId}`);
  console.log(
    `   FIREBASE_API_KEY: ${
      firebaseApiKey
        ? `설정됨 (${firebaseApiKey.substring(0, 10)}...)`
        : "⚠️ 설정되지 않음"
    }`
  );
}

console.log("\n🎉 Vite 번들링 및 환경 변수 주입 완료!");
console.log("📦 dist 폴더는 난독화/최소화되었습니다.");
