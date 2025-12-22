import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// 자산 복사 및 HTML 복사 플러그인
const copyAssetsPlugin = {
  name: 'copy-assets',
  writeBundle() {
    try {
      // libs 폴더 복사 및 source map 제거
      const libsSrc = resolve(__dirname, 'libs');
      const libsDest = resolve(__dirname, 'dist', 'libs');

      mkdirSync(libsDest, { recursive: true });
      const files = readdirSync(libsSrc);
      files.forEach(file => {
        if (file.endsWith('.js') && !file.endsWith('.map.js')) {
          copyFileSync(
            resolve(libsSrc, file),
            resolve(libsDest, file)
          );
        }
      });
      console.log('✅ libs 폴더 복사 완료 (source map 제외)');

      // manifest.json 복사
      const manifestSrc = resolve(__dirname, 'manifest.json');
      const manifestDest = resolve(__dirname, 'dist', 'manifest.json');
      copyFileSync(manifestSrc, manifestDest);
      console.log('✅ manifest.json 복사 완료');

      // HTML 파일 복사 (Vite에서 자동 생성되지 않음)
      ['popup.html', 'offscreen.html'].forEach(htmlFile => {
        const htmlSrc = resolve(__dirname, htmlFile);
        const htmlDest = resolve(__dirname, 'dist', htmlFile);
        copyFileSync(htmlSrc, htmlDest);
      });
      console.log('✅ HTML 파일 복사 완료');

      // 아이콘 파일 복사
      const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
      iconFiles.forEach(iconFile => {
        const iconSrc = resolve(__dirname, iconFile);
        const iconDest = resolve(__dirname, 'dist', iconFile);
        if (existsSync(iconSrc)) {
          copyFileSync(iconSrc, iconDest);
        }
      });
      console.log('✅ 아이콘 파일 복사 완료');
    } catch (error) {
      console.warn('⚠️ 자산 복사 실패:', error.message);
    }
  },
};

export default defineConfig({
  build: {
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: false,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.js'),
        popup: resolve(__dirname, 'popup.js'),
        offscreen: resolve(__dirname, 'offscreen.js'),
        'content-script': resolve(__dirname, 'content-script.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
      },
    },
  },
  plugins: [copyAssetsPlugin],
});
