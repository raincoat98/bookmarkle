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
  const missingIcons = iconFiles.filter(
    (icon) => !fs.existsSync(path.join(__dirname, icon))
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

// background.js에 SIGNIN_POPUP_URL 주입
const backgroundPath = path.join(distDir, "background.js");
if (fs.existsSync(backgroundPath)) {
  const signinPopupUrlWithParam =
    signinPopupUrl +
    (signinPopupUrl.includes("?") ? "&" : "?") +
    "extension=true";

  let content = fs.readFileSync(backgroundPath, "utf8");
  // 난독화 후에도 작동하도록 문자열만 찾아서 교체
  content = content.replace(
    /"SIGNIN_POPUP_URL_PLACEHOLDER"/g,
    `"${signinPopupUrlWithParam}"`
  );
  fs.writeFileSync(backgroundPath, content, "utf8");
  console.log("✅ background.js 환경 변수 주입 완료");
  console.log(`   SIGNIN_POPUP_URL: ${signinPopupUrlWithParam}`);
}

// offscreen.js에 Firebase Config 주입
const offscreenPath = path.join(distDir, "offscreen.js");
if (fs.existsSync(offscreenPath)) {
  let content = fs.readFileSync(offscreenPath, "utf8");

  content = content.replace(
    /apiKey:"FIREBASE_API_KEY_PLACEHOLDER"/,
    `apiKey:"${firebaseApiKey}"`
  );
  content = content.replace(
    /authDomain:"FIREBASE_AUTH_DOMAIN_PLACEHOLDER"/,
    `authDomain:"${firebaseAuthDomain}"`
  );
  content = content.replace(
    /projectId:"FIREBASE_PROJECT_ID_PLACEHOLDER"/,
    `projectId:"${firebaseProjectId}"`
  );
  content = content.replace(
    /storageBucket:"FIREBASE_STORAGE_BUCKET_PLACEHOLDER"/,
    `storageBucket:"${firebaseStorageBucket}"`
  );
  content = content.replace(
    /messagingSenderId:"FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER"/,
    `messagingSenderId:"${firebaseMessagingSenderId}"`
  );
  content = content.replace(
    /appId:"FIREBASE_APP_ID_PLACEHOLDER"/,
    `appId:"${firebaseAppId}"`
  );

  fs.writeFileSync(offscreenPath, content, "utf8");
  console.log("✅ offscreen.js 환경 변수 주입 완료");
}

console.log("\n🎉 Vite 번들링 및 환경 변수 주입 완료!");
console.log("📦 dist 폴더는 난독화/최소화되었습니다.");
