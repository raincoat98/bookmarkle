import { DEFAULT_LANGUAGE } from "./constants.js";

let i18nResources = {};
let currentLanguage = DEFAULT_LANGUAGE;

// 언어 리소스 로드
export async function loadLanguageResources(lang) {
  if (i18nResources[lang]) {
    return i18nResources[lang];
  }

  try {
    const response = await fetch(chrome.runtime.getURL(`locales/${lang}.json`));
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    const resources = await response.json();
    i18nResources[lang] = resources;
    return resources;
  } catch (error) {
    console.error(`Failed to load language resources for ${lang}:`, error);
    if (lang !== DEFAULT_LANGUAGE) {
      return loadLanguageResources(DEFAULT_LANGUAGE);
    }
    return {};
  }
}

// 현재 언어 가져오기
export async function getCurrentLanguage() {
  const result = await chrome.storage.local.get(["language"]);
  return result.language || DEFAULT_LANGUAGE;
}

// i18n 번역 함수 (t 함수)
export async function t(key, lang = null) {
  const langToUse = lang || currentLanguage || (await getCurrentLanguage());
  const resources = await loadLanguageResources(langToUse);

  const keys = key.split(".");
  let value = resources;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      if (langToUse !== DEFAULT_LANGUAGE) {
        return t(key, DEFAULT_LANGUAGE);
      }
      return key;
    }
  }

  return value || key;
}

// 언어 변경
export async function setLanguage(lang) {
  await chrome.storage.local.set({ language: lang });
  currentLanguage = lang;
}

// 현재 언어 설정
export function setCurrentLanguage(lang) {
  currentLanguage = lang;
}
