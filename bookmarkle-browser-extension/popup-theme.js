import { dom } from "./popup-dom.js";

export function setTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  if (mode === "dark") {
    if (dom.themeIcon) {
      dom.themeIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />';
    }
  } else if (dom.themeIcon) {
    dom.themeIcon.innerHTML =
      '<circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />';
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
