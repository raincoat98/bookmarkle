// 테마 관련 함수들
export function getTheme() {
  try {
    const theme = localStorage.getItem("theme") || "dark";
    return theme;
  } catch (error) {
    console.error("테마 가져오기 오류:", error);
    return "dark";
  }
}

export async function setTheme(theme) {
  try {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  } catch (error) {
    console.error("테마 저장 오류:", error);
  }
}

export function applyTheme(theme) {
  const body = document.body;
  if (theme === "light") {
    body.classList.add("light-theme");
  } else {
    body.classList.remove("light-theme");
  }
}

export async function toggleTheme() {
  const currentTheme = getTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  await setTheme(newTheme);
  return newTheme;
}

export async function loadTheme() {
  const theme = getTheme();
  applyTheme(theme);
}
