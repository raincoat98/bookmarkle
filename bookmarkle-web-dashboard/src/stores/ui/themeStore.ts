import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "auto";

interface ThemeState {
  theme: Theme;
  isDark: boolean;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  applyTheme: (currentTheme: Theme) => void;
  getSystemTheme: () => "light" | "dark";
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      // State
      theme: "light",
      isDark: false,

      // Actions
      setTheme: (newTheme: Theme) => {
        set({ theme: newTheme });
        get().applyTheme(newTheme);
      },

      // 시스템 테마 감지
      getSystemTheme: (): "light" | "dark" => {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      },

      // 실제 테마 적용
      applyTheme: (currentTheme: Theme) => {
        let shouldBeDark = false;

        if (currentTheme === "dark") {
          shouldBeDark = true;
        } else if (currentTheme === "auto") {
          shouldBeDark = get().getSystemTheme() === "dark";
        }

        set({ isDark: shouldBeDark });
        document.documentElement.classList.toggle("dark", shouldBeDark);
      },
    }),
    {
      name: "theme-storage",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

// 시스템 테마 변경 감지를 위한 초기화 함수
export const initializeTheme = () => {
  const store = useThemeStore.getState();

  // 초기 테마 적용
  store.applyTheme(store.theme);

  // 시스템 테마 변경 감지 (auto 모드일 때만)
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = () => {
    if (store.theme === "auto") {
      store.applyTheme(store.theme);
    }
  };

  mediaQuery.addEventListener("change", handleSystemThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
  };
};
