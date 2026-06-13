const admin = require("firebase-admin");
const path = require("path");

// 프로젝트 루트의 .env와 대시보드의 .env 둘 다 시도
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({
  path: path.resolve(__dirname, "../bookmarkle-web-dashboard/.env"),
});

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "bookmarkhub-5ea6c",
});

// 환경변수에서 관리자 이메일 가져오기
const adminEmails = process.env.VITE_ADMIN_EMAIL
  ? [process.env.VITE_ADMIN_EMAIL]
  : [
      "ww57403@gmail.com", // 기본 관리자 (fallback)
    ];

async function setAdminClaims() {
  try {
    console.log("🔧 관리자 권한 설정을 시작합니다...");
    console.log(`📧 설정할 관리자 이메일: ${adminEmails.join(", ")}`);
    console.log("");

    for (const email of adminEmails) {
      // 이메일로 사용자 찾기
      const user = await admin.auth().getUserByEmail(email);

      // Custom Claims 설정
      await admin.auth().setCustomUserClaims(user.uid, {
        isAdmin: true,
      });

      console.log(
        `✅ ${email} (UID: ${user.uid})에게 관리자 권한을 부여했습니다.`
      );

      // Firestore admins 컬렉션에도 추가
      await admin
        .firestore()
        .collection("admins")
        .doc(user.uid)
        .set(
          {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      console.log(`✅ ${email}을 admins 컬렉션에 추가했습니다.`);

      // users 컬렉션에 isAdmin 필드 추가
      await admin.firestore().collection("users").doc(user.uid).set(
        {
          isAdmin: true,
        },
        { merge: true }
      );

      console.log(`✅ ${email}의 users 문서에 isAdmin 필드를 추가했습니다.`);
    }

    console.log("\n🎉 모든 관리자 권한 설정이 완료되었습니다!");
    console.log(
      "⚠️  변경사항을 적용하려면 사용자가 로그아웃 후 다시 로그인해야 합니다."
    );
    console.log("\n📋 설정된 관리자 정보:");
    console.log(
      `   - 환경변수 VITE_ADMIN_EMAIL: ${
        process.env.VITE_ADMIN_EMAIL || "설정되지 않음"
      }`
    );
    console.log(`   - 실제 설정된 관리자: ${adminEmails.join(", ")}`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  } finally {
    process.exit(0);
  }
}

setAdminClaims();
