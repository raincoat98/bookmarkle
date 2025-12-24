// lucide.js 아이콘 관련
export function initializeIcons() {
  if (window.lucide && window.lucide.createIcons) {
    try {
      window.lucide.createIcons();
    } catch (error) {
      console.error("Icon initialization error:", error);
    }
  } else {
    console.warn("Lucide library not fully loaded");
  }
}

export function reinitializeLucideIcons() {
  initializeIcons();
}
