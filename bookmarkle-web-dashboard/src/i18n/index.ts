import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector/cjs";

// 언어 파일들
import ko from "./locales/ko.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

const resources = {
  ko: {
    translation: ko,
  },
  en: {
    translation: en,
  },
  ja: {
    translation: ja,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: "ko", // 기본 언어를 한국어로 강제 설정
    fallbackLng: "ko",
    debug: false,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;
