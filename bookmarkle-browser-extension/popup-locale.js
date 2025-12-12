import { dom } from "./popup-dom.js";
import { state } from "./popup-state.js";

export async function loadLanguageTexts() {
  try {
    const res = await fetch("i18n.json");
    state.languageTexts = await res.json();
  } catch (error) {
    console.error("i18n.json load error:", error);
    state.languageTexts = {};
  }
}

export function getCurrentLanguage() {
  return localStorage.getItem("language") || "ko";
}

export function applyLanguageUI(lang) {
  const texts = state.languageTexts[lang];
  if (!texts) return;

  const privacyPolicyText = document.getElementById("privacyPolicyText");
  const contactText = document.getElementById("contactText");
  if (privacyPolicyText) privacyPolicyText.textContent = texts.privacyPolicy;
  if (contactText) contactText.textContent = texts.contact;

  if (dom.languageSettingsBtn) {
    if (lang === "ko") dom.languageSettingsBtn.textContent = "🇰🇷";
    else if (lang === "en") dom.languageSettingsBtn.textContent = "🇺🇸";
    else if (lang === "ja") dom.languageSettingsBtn.textContent = "🇯🇵";
  }

  const currentPageLabel = document.querySelector(".current-page .label");
  if (currentPageLabel) currentPageLabel.textContent = texts.currentPageLabel;

  const sponsorButton = document.getElementById("sponsorButton");
  if (sponsorButton?.querySelector("span")) {
    sponsorButton.querySelector("span").textContent = texts.sponsor;
  }

  const bugReportButton = document.getElementById("bugReportButton");
  if (bugReportButton?.querySelector("span")) {
    bugReportButton.querySelector("span").textContent = texts.bugReport;
  }

  const dividerSpans = document.querySelectorAll(".flex.justify-center.gap-4.text-xs > span");
  dividerSpans.forEach((span) => {
    if (
      span.textContent.trim() === "|" ||
      span.textContent.trim() === state.languageTexts.ko?.divider ||
      span.textContent.trim() === state.languageTexts.en?.divider ||
      span.textContent.trim() === state.languageTexts.ja?.divider
    ) {
      span.textContent = texts.divider;
    }
  });

  const btnLogin = document.getElementById("login-btn");
  if (btnLogin?.querySelector("span")) {
    btnLogin.querySelector("span").textContent = texts.login;
  }

  if (dom.saveBtn) {
    dom.saveBtn.textContent = texts.bookmarkSaveBtn || "북마크 저장";
  }

  if (dom.dropdownOptions) {
    const addOptionDiv = dom.dropdownOptions.querySelector(".dropdown-option.add");
    if (addOptionDiv) {
      addOptionDiv.textContent = texts.addCollectionOption || "+ 새 컬렉션 추가";
    }
    const firstOptionDiv = dom.dropdownOptions.querySelector(".dropdown-option");
    if (firstOptionDiv && firstOptionDiv.dataset.value === "") {
      firstOptionDiv.textContent = texts.collectionSelect || "컬렉션 선택...";
    }
  }

  if (dom.dropdownSelectedText) {
    dom.dropdownSelectedText.textContent = texts.collectionSelect || "컬렉션 선택...";
  }

  if (dom.descriptionInput) {
    dom.descriptionInput.placeholder = texts.descriptionPlaceholder || "설명 입력 (선택사항)...";
  }

  if (dom.tagInput) {
    dom.tagInput.placeholder = texts.tagPlaceholder || "엔터로 태그 추가 (쉼표로 구분)";
  }

  if (dom.addCollectionModal) {
    const title = dom.addCollectionModal.querySelector("h3");
    if (title) title.textContent = texts.addCollectionTitle || "새 컬렉션 추가";
    const labels = dom.addCollectionModal.querySelectorAll("label");
    if (labels.length > 0) labels[0].textContent = texts.collectionNameLabel || "컬렉션 이름";
    if (labels.length > 1) labels[1].textContent = texts.collectionIconLabel || "아이콘 (선택사항)";
    if (dom.collectionNameInput) {
      dom.collectionNameInput.placeholder = texts.collectionNamePlaceholder || "컬렉션 이름을 입력하세요";
    }
    if (dom.collectionIconInput) {
      dom.collectionIconInput.placeholder =
        texts.collectionIconPlaceholder || "아이콘을 입력하세요 (예: 📁, 💻, ⭐)";
    }
    if (dom.cancelCollectionBtn) {
      dom.cancelCollectionBtn.textContent = texts.cancelBtn || "취소";
    }
    if (dom.confirmCollectionBtn) {
      dom.confirmCollectionBtn.textContent = texts.addBtn || "추가";
    }
  }

  if (dom.languageModal) {
    const title = dom.languageModal.querySelector("h3");
    if (title) title.textContent = texts.languageTitle || "언어 설정";
    if (dom.languageCancelBtn) dom.languageCancelBtn.textContent = texts.cancelBtn || "취소";
    if (dom.languageSaveBtn) dom.languageSaveBtn.textContent = texts.saveBtn || "저장";
    const labels = dom.languageModal.querySelectorAll("label span.text-sm");
    if (labels.length > 0) labels[0].textContent = texts.langKo || "🇰🇷 한국어";
    if (labels.length > 1) labels[1].textContent = texts.langEn || "🇺🇸 English";
    if (labels.length > 2) labels[2].textContent = texts.langJa || "🇯🇵 日本語";
  }
}

export function showToast(message, type = "success") {
  if (!dom.toast) return;
  const lang = getCurrentLanguage();
  const texts = state.languageTexts[lang] || {};

  if (
    message === "북마크가 저장되었습니다!" ||
    message === "Bookmark saved!" ||
    message === "ブックマークが保存されました！"
  ) {
    dom.toast.textContent = texts.bookmarkSaved;
  } else if (
    message === "북마크 저장 오류" ||
    message === "Bookmark save error" ||
    message === "ブックマーク保存エラー"
  ) {
    dom.toast.textContent = texts.bookmarkSaveError;
  } else if (
    message === "컬렉션이 추가되었습니다!" ||
    message === "Collection added!" ||
    message === "コレクションが追加されました！"
  ) {
    dom.toast.textContent = texts.addCollection;
  } else if (
    message === "컬렉션 이름을 입력하세요." ||
    message === "Please enter a collection name." ||
    message === "コレクション名を入力してください。"
  ) {
    dom.toast.textContent = texts.collectionNameRequired;
  } else {
    dom.toast.textContent = message;
  }

  dom.toast.className = "";
  dom.toast.removeAttribute("style");
  dom.toast.classList.add("show");

  if (type === "error") {
    dom.toast.classList.add("error");
  } else if (type === "info") {
    dom.toast.classList.add("info");
  } else if (type === "warning") {
    dom.toast.classList.add("warning");
  }

  setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 2000);
}
