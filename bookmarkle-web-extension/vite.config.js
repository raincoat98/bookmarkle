import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync, copyFileSync, mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// 자산 복사 및 HTML 복사 플러그인
const copyAssetsPlugin = {
  name: "copy-assets",
  writeBundle() {
    try {
      // manifest.json 복사
      const manifestSrc = resolve(__dirname, "manifest.json");
      const manifestDest = resolve(__dirname, "dist", "manifest.json");
      copyFileSync(manifestSrc, manifestDest);
      console.log("✅ manifest.json 복사 완료");

      // HTML 파일 복사 (Vite에서 자동 생성되지 않음)
      ["popup.html", "options.html", "newtab.html"].forEach((htmlFile) => {
        const htmlSrc = resolve(__dirname, htmlFile);
        const htmlDest = resolve(__dirname, "dist", htmlFile);
        if (existsSync(htmlSrc)) {
          copyFileSync(htmlSrc, htmlDest);
        }
      });
      console.log("✅ HTML 파일 복사 완료");

      // CSS 파일 복사 (옵션 페이지용)
      ["options.css"].forEach((cssFile) => {
        const cssSrc = resolve(__dirname, cssFile);
        const cssDest = resolve(__dirname, "dist", cssFile);
        if (existsSync(cssSrc)) {
          copyFileSync(cssSrc, cssDest);
        } else {
          console.warn(`⚠️ ${cssFile} 파일을 찾을 수 없습니다:`, cssSrc);
        }
      });
      console.log("✅ CSS 파일 복사 완료");

      // popup/styles 폴더 복사
      const popupStylesDir = resolve(__dirname, "popup", "styles");
      const distPopupStylesDir = resolve(__dirname, "dist", "popup", "styles");
      if (existsSync(popupStylesDir)) {
        if (!existsSync(distPopupStylesDir)) {
          mkdirSync(distPopupStylesDir, { recursive: true });
        }
        const styleFiles = readdirSync(popupStylesDir);
        styleFiles.forEach((styleFile) => {
          if (styleFile.endsWith(".css")) {
            const styleSrc = resolve(popupStylesDir, styleFile);
            const styleDest = resolve(distPopupStylesDir, styleFile);
            copyFileSync(styleSrc, styleDest);
          }
        });
        console.log("✅ popup/styles 파일 복사 완료");
      }

      // 옵션 페이지 및 새 탭 페이지 JS 파일 복사
      ["options.js", "newtab.js"].forEach((jsFile) => {
        const jsSrc = resolve(__dirname, jsFile);
        const jsDest = resolve(__dirname, "dist", jsFile);
        if (existsSync(jsSrc)) {
          copyFileSync(jsSrc, jsDest);
          console.log(`✅ ${jsFile} 복사 완료`);
        } else {
          console.warn(`⚠️ ${jsFile} 파일을 찾을 수 없습니다:`, jsSrc);
        }
      });

      // 아이콘 파일 복사
      const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];
      const iconsDir = resolve(__dirname, "icons");
      const distIconsDir = resolve(__dirname, "dist", "icons");
      if (!existsSync(distIconsDir)) {
        mkdirSync(distIconsDir, { recursive: true });
      }
      iconFiles.forEach((iconFile) => {
        const iconSrc = resolve(iconsDir, iconFile);
        const iconDest = resolve(distIconsDir, iconFile);
        if (existsSync(iconSrc)) {
          copyFileSync(iconSrc, iconDest);
        }
      });
      console.log("✅ 아이콘 파일 복사 완료");

      // locales 폴더 복사
      const localesDir = resolve(__dirname, "locales");
      const distLocalesDir = resolve(__dirname, "dist", "locales");
      if (existsSync(localesDir)) {
        if (!existsSync(distLocalesDir)) {
          mkdirSync(distLocalesDir, { recursive: true });
        }
        const localeFiles = ["ko.json", "en.json", "ja.json"];
        localeFiles.forEach((localeFile) => {
          const localeSrc = resolve(localesDir, localeFile);
          const localeDest = resolve(distLocalesDir, localeFile);
          if (existsSync(localeSrc)) {
            copyFileSync(localeSrc, localeDest);
          }
        });
        console.log("✅ locales 파일 복사 완료");
      }

      // lucide.js 파일 복사
      const lucideSrc = resolve(__dirname, "lucide.js");
      const lucideDest = resolve(__dirname, "dist", "lucide.js");
      if (existsSync(lucideSrc)) {
        copyFileSync(lucideSrc, lucideDest);
        console.log("✅ lucide.js 복사 완료");
      } else {
        console.warn("⚠️ lucide.js 파일을 찾을 수 없습니다:", lucideSrc);
      }
    } catch (error) {
      console.warn("⚠️ 자산 복사 실패:", error.message);
    }
  },
};

export default defineConfig({
  build: {
    outDir: "dist",
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: false,
      },
      mangle: {
        reserved: [
          "FIREBASE_API_KEY",
          "FIREBASE_PROJECT_ID",
          "SIGNIN_POPUP_URL",
        ],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        background: resolve(__dirname, "background.js"),
        popup: resolve(__dirname, "popup.js"),
        "content-script": resolve(__dirname, "content-script.js"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        // background.js는 모든 코드를 단일 파일로 번들링
        manualChunks: (id) => {
          // background 관련 코드는 모두 같은 청크로 묶어서 단일 파일로 생성
          if (
            id.includes("background.js") ||
            id.includes("background/") ||
            id === resolve(__dirname, "background.js")
          ) {
            return "background";
          }
          // popup과 content-script는 기본 분할 전략 사용
          return null;
        },
        // background는 동적 import도 인라인화하여 단일 파일로
        inlineDynamicImports: false, // 개별적으로 제어
      },
    },
  },
  plugins: [
    copyAssetsPlugin,
    // background.js를 위한 커스텀 플러그인
    // preload-helper 청크를 제거하고 background.js에 인라인화
    {
      name: "remove-preload-helper",
      generateBundle(options, bundle) {
        const backgroundChunk = bundle["background.js"];
        if (!backgroundChunk || !backgroundChunk.code) return;

        // preload-helper 청크 찾기
        const preloadHelperKey = Object.keys(bundle).find(
          (key) => key.startsWith("preload-helper") && key.endsWith(".js")
        );

        if (preloadHelperKey && bundle[preloadHelperKey]) {
          // preload-helper 청크 삭제
          delete bundle[preloadHelperKey];
          console.log(`✅ preload-helper 청크 제거: ${preloadHelperKey}`);
        }

        // background.js에서 preload-helper import 문 제거
        const importPattern =
          /import\s*{\s*_\s*as\s+\w+\s*}\s*from\s*["']\.\/preload-helper-[^"']+["'];?\s*/g;
        if (importPattern.test(backgroundChunk.code)) {
          backgroundChunk.code = backgroundChunk.code.replace(
            importPattern,
            ""
          );
          console.log("✅ background.js에서 preload-helper import 제거");
        }
      },
    },
  ],
});
