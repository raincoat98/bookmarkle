import { dom } from "./dom.js";

export function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);

  if (!dom.themeIcon) return;

  // 보안: HTML에 미리 정의된 요소의 클래스만 변경 (innerHTML 사용 안 함)
  if (mode === "dark") {
    // 달 아이콘 표시 (어두운 테마)
    if (dom.themeIconDark) dom.themeIconDark.classList.remove("hidden");
    if (dom.themeIconLight) dom.themeIconLight.classList.add("hidden");
    dom.themeIcon.setAttribute("data-theme", "dark");
  } else {
    // 태양 아이콘 표시 (밝은 테마)
    if (dom.themeIconDark) dom.themeIconDark.classList.add("hidden");
    if (dom.themeIconLight) dom.themeIconLight.classList.remove("hidden");
    dom.themeIcon.setAttribute("data-theme", "light");
  }

  localStorage.setItem("theme", mode);
}

export function toggleTheme() {
  const current = localStorage.getItem("theme") || "light";
  setTheme(current === "dark" ? "light" : "dark");
}

export function initTheme() {
  if (window._themeApplied) return;
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
  window._themeApplied = true;
}
