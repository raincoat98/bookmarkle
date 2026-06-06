import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-ui": ["framer-motion", "lucide-react", "react-hot-toast"],
          "vendor-i18n": ["react-i18next", "i18next"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "북마클",
        short_name: "북마클",
        description: "원하는 웹페이지를 한 번에 저장하고 간편하게 관리하는 나만의 책갈피",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "ko",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // 즉시 활성화: 새 SW가 설치되면 대기 없이 바로 적용
        skipWaiting: true,
        clientsClaim: true,
        // 정적 자산 외 캐시 정리
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "firebase-cache",
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/openweathermap\.org\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "weather-cache" },
          },
          {
            urlPattern: /^https:\/\/.*\.google(apis)?\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-cache" },
          },
        ],
      },
    }),
  ],
});
