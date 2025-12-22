// Popup Script

import { User, Settings, LogOut } from "lucide";

// ===== 아이콘 헬퍼 함수 =====

// lucide 아이콘을 SVG 문자열로 변환하는 헬퍼 함수
function iconToSvg(iconData, options = {}) {
  const { width = 24, height = 24, class: className = "" } = options;

  // iconData는 ["svg", attrs, children] 형태의 배열
  if (!Array.isArray(iconData) || iconData.length < 2) {
    console.error("Invalid icon data:", iconData);
    return "";
  }

  const [tag, attrs, children] = iconData;

  // 기본 SVG 속성에 옵션으로 전달된 크기와 클래스 적용
  const svgAttrs = {
    ...attrs,
    width: width.toString(),
    height: height.toString(),
  };

  if (className) {
    svgAttrs.class = className;
  }

  // 속성을 문자열로 변환 (속성 이름은 그대로 사용)
  const attrsStr = Object.entries(svgAttrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

  // children 처리 (재귀적으로 처리)
  function renderChildren(childrenArray) {
    if (!Array.isArray(childrenArray)) {
      return "";
    }

    return childrenArray
      .map((child) => {
        if (Array.isArray(child) && child.length >= 2) {
          const [childTag, childAttrs, childChildren] = child;
          const childAttrsStr = Object.entries(childAttrs || {})
            .map(([key, value]) => `${key}="${value}"`)
            .join(" ");

          if (
            childChildren &&
            Array.isArray(childChildren) &&
            childChildren.length > 0
          ) {
            return `<${childTag} ${childAttrsStr}>${renderChildren(
              childChildren
            )}</${childTag}>`;
          }
          return `<${childTag} ${childAttrsStr} />`;
        }
        return "";
      })
      .join("");
  }

  const childrenStr = renderChildren(children || []);

  return `<svg ${attrsStr}>${childrenStr}</svg>`;
}

// ===== 아이콘 초기화 =====
function initializeIcons() {
  const userIconEl = document.getElementById("userIcon");
  const settingsIconEl = document.getElementById("settingsIcon");
  const logoutIconEl = document.getElementById("logoutIcon");

  if (userIconEl) {
    // User는 이미 아이콘 정의 배열이거나 함수일 수 있음
    const userIconData = typeof User === "function" ? User() : User;
    userIconEl.innerHTML = iconToSvg(userIconData, {
      width: 16,
      height: 16,
      class: "lucide-icon",
    });
  }

  if (settingsIconEl) {
    const settingsIconData =
      typeof Settings === "function" ? Settings() : Settings;
    settingsIconEl.innerHTML = iconToSvg(settingsIconData, {
      width: 16,
      height: 16,
      class: "lucide-icon",
    });
  }

  if (logoutIconEl) {
    const logoutIconData = typeof LogOut === "function" ? LogOut() : LogOut;
    logoutIconEl.innerHTML = iconToSvg(logoutIconData, {
      width: 16,
      height: 16,
      class: "lucide-icon",
    });
  }
}

// ===== DOM 요소 =====
const loginButtons = document.getElementById("loginButtons");
const loginGoogleBtn = document.getElementById("loginGoogleBtn");
const loginEmailBtn = document.getElementById("loginEmailBtn");
const userHeaderDiv = document.getElementById("userHeader");
const userEmailSpan = document.getElementById("userEmail");
const statusBadge = document.getElementById("statusBadge");
const menuBtn = document.getElementById("menuBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const menuUserInfo = document.getElementById("menuUserInfo");
const menuLogout = document.getElementById("menuLogout");
const userInfoModal = document.getElementById("userInfoModal");
const userDetailsDiv = document.getElementById("userDetails");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const loadingDiv = document.getElementById("loading");
const dataInfoDiv = document.getElementById("dataInfo");
const dataCountDiv = document.getElementById("dataCount");
const statusMessageDiv = document.getElementById("statusMessage");
const saveBookmarkSection = document.getElementById("saveBookmarkSection");
const saveBookmarkBtn = document.getElementById("saveBookmarkBtn");

// ===== 헬퍼 함수 =====

// 사용자 정보 표시 (XSS 방지)
function displayUserInfo(user) {
  userDetailsDiv.innerHTML = "";

  const emailDiv = document.createElement("div");
  emailDiv.textContent = `이메일: ${user.email || "N/A"}`;

  const nameDiv = document.createElement("div");
  nameDiv.textContent = `이름: ${user.displayName || "N/A"}`;

  const uidDiv = document.createElement("div");
  uidDiv.textContent = `UID: ${user.uid || "N/A"}`;

  userDetailsDiv.appendChild(emailDiv);
  userDetailsDiv.appendChild(nameDiv);
  userDetailsDiv.appendChild(uidDiv);
}

// 모달 열기
function showUserInfoModal() {
  userInfoModal.classList.add("show");
}

// 모달 닫기
function closeUserInfoModal() {
  userInfoModal.classList.remove("show");
  dropdownMenu.style.display = "none";
  reinitializeLucideIcons();
}

// 데이터 정보 UI 업데이트
function updateDataInfo(display = true, text = null) {
  if (dataInfoDiv) {
    dataInfoDiv.style.display = display ? "block" : "none";
  }
  if (dataCountDiv && text !== null) {
    dataCountDiv.textContent = text;
  }
}

// 상태 메시지 UI 업데이트
function updateStatus(message, isSuccess = false) {
  if (statusMessageDiv) {
    statusMessageDiv.textContent = message;
    statusMessageDiv.style.display = "block";
    statusMessageDiv.className = isSuccess
      ? "status logged-in"
      : "status logged-out";

    // 3초 후 자동 숨김
    setTimeout(() => {
      statusMessageDiv.style.display = "none";
    }, 3000);
  }
}

// Lucide 아이콘 다시 초기화
function reinitializeLucideIcons() {
  if (window.lucide) {
    lucide.createIcons();
  }
}

// 로그인 상태 UI 업데이트
function updateLoginUI(isLoggedIn, user = null) {
  if (isLoggedIn && user) {
    // 로그인 상태
    userEmailSpan.textContent = user.email || "사용자";
    statusBadge.className = "status-badge";
    displayUserInfo(user);
    userHeaderDiv.style.display = "flex";
    saveBookmarkSection.style.display = "block";
    if (loginButtons) loginButtons.style.display = "none";
    loadDataCount();
  } else {
    // 로그인되지 않은 상태
    userHeaderDiv.style.display = "none";
    saveBookmarkSection.style.display = "none";
    updateDataInfo(false);
    if (loginButtons) loginButtons.style.display = "flex";
    closeUserInfoModal();
  }
  reinitializeLucideIcons();
}

// ===== 비즈니스 로직 =====

// 인증 상태 로드
async function loadAuthState() {
  try {
    chrome.storage.local.get(["user"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("저장된 상태 로드 오류:", chrome.runtime.lastError);
        requestUserFromBackground();
        return;
      }

      const storedUser = result?.user;
      if (storedUser) {
        console.log("✅ Storage에서 사용자 정보 복원:", storedUser.email);
        updateLoginUI(true, storedUser);
      } else {
        console.log("📭 Storage에 사용자 정보 없음 - Background에서 요청");
        requestUserFromBackground();
      }
    });
  } catch (error) {
    console.error("상태 로드 오류:", error);
    updateStatus("로그인되지 않음", false);
  }
}

// Background에서 메모리 정보 요청 (fallback)
function requestUserFromBackground() {
  chrome.runtime.sendMessage({ type: "GET_CURRENT_USER" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Background 상태 로드 실패:", chrome.runtime.lastError);
      updateLoginUI(false);
      return;
    }

    updateLoginUI(!!response?.user, response?.user || null);
  });
}

// 컬렉션 개수 로드
async function loadDataCount() {
  console.log("📊 컬렉션 개수 로드 시작");
  updateDataInfo(true, "로딩 중...");

  try {
    chrome.runtime.sendMessage("GET_DATA_COUNT", (response) => {
      console.log("📥 Background로부터 응답 수신:", response);

      if (chrome.runtime.lastError) {
        console.error("컬렉션 개수 가져오기 실패:", chrome.runtime.lastError);
        updateDataInfo(true, "컬렉션을 가져올 수 없습니다");
        return;
      }

      if (response?.success) {
        console.log("✅ 컬렉션 개수:", response.count);
        updateDataInfo(true, `총 ${response.count}개 컬렉션`);
      } else {
        console.error("❌ 컬렉션 개수 가져오기 실패:", response?.error);
        updateDataInfo(true, response?.error || "컬렉션을 가져올 수 없습니다");
      }
    });
  } catch (error) {
    console.error("컬렉션 개수 로드 오류:", error);
    updateDataInfo(true, "컬렉션을 가져올 수 없습니다");
  }
}

// 북마크 저장
async function saveCurrentPageBookmark() {
  console.log("📚 북마크 저장 시작");

  saveBookmarkBtn.disabled = true;
  saveBookmarkBtn.textContent = "저장 중...";

  try {
    const response = await chrome.runtime.sendMessage("SAVE_BOOKMARK");

    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }

    if (response?.success) {
      console.log("✅ 북마크 저장 성공:", response.bookmarkId);
      updateStatus("북마크가 저장되었습니다! 🎉", true);

      // 데이터 개수 새로고침
      setTimeout(() => {
        loadDataCount();
      }, 500);
    } else {
      console.error("❌ 북마크 저장 실패:", response?.error);
      updateStatus(response?.error || "북마크 저장 중 오류가 발생했습니다", false);
    }
  } catch (error) {
    console.error("북마크 저장 오류:", error);
    updateStatus("북마크 저장 중 오류가 발생했습니다: " + error.message, false);
  } finally {
    saveBookmarkBtn.disabled = false;
    saveBookmarkBtn.textContent = "📚 현재 페이지 북마크";
  }
}

// ===== 이벤트 리스너 =====

// 로그인 처리 헬퍼 함수
function handleLogin(mode) {
  const loginBtn = mode === "google" ? loginGoogleBtn : loginEmailBtn;
  loginBtn.disabled = true;
  if (mode === "google" && loginEmailBtn) loginEmailBtn.disabled = true;
  if (mode === "email" && loginGoogleBtn) loginGoogleBtn.disabled = true;
  loadingDiv.style.display = "block";
  updateStatus("로그인 페이지를 여는 중...", false);

  const messageType = mode === "google" ? "LOGIN_GOOGLE" : "LOGIN_EMAIL";
  chrome.runtime.sendMessage(messageType, () => {
    if (chrome.runtime.lastError) {
      console.error("메시지 전송 오류:", chrome.runtime.lastError);
      updateStatus("로그인 실패: " + chrome.runtime.lastError.message, false);
      loadingDiv.style.display = "none";
      loginBtn.disabled = false;
      if (mode === "google" && loginEmailBtn) loginEmailBtn.disabled = false;
      if (mode === "email" && loginGoogleBtn) loginGoogleBtn.disabled = false;
    } else {
      updateStatus(
        "로그인 페이지가 열렸습니다. 새 탭에서 로그인을 진행하세요.",
        false
      );
    }
  });
}

// Google 로그인 버튼 클릭
loginGoogleBtn.addEventListener("click", () => {
  handleLogin("google");
});

// 이메일 로그인 버튼 클릭
loginEmailBtn.addEventListener("click", () => {
  handleLogin("email");
});

// 메뉴 버튼 클릭
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.style.display =
    dropdownMenu.style.display === "none" ? "block" : "none";
});

// 문서 클릭 시 드롭다운 닫기
document.addEventListener("click", (e) => {
  if (!menuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.style.display = "none";
  }
});

// 사용자 정보 메뉴 클릭
menuUserInfo.addEventListener("click", () => {
  showUserInfoModal();
  dropdownMenu.style.display = "none";
});

// 로그아웃 메뉴 클릭
menuLogout.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    if (chrome.runtime.lastError) {
      console.error("로그아웃 오류:", chrome.runtime.lastError);
      return;
    }

    updateLoginUI(false);
  });
});

// 모달 닫기 버튼 클릭
modalCloseBtn.addEventListener("click", () => {
  closeUserInfoModal();
});

// 모달 배경 클릭 시 닫기
userInfoModal.addEventListener("click", (e) => {
  if (e.target === userInfoModal) {
    closeUserInfoModal();
  }
});

// 북마크 저장 버튼 클릭
saveBookmarkBtn.addEventListener("click", () => {
  saveCurrentPageBookmark();
});

// Storage 변경 이벤트 리스너
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.user) {
    console.log("📥 Storage 변경 감지 - 상태 업데이트 중...");
    updateLoginUI(!!changes.user.newValue, changes.user.newValue || null);
  }
});

// Background에서 인증 성공 메시지 수신
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTH_SUCCESS") {
    updateStatus("로그인 성공!", true);
    updateLoginUI(true, message.user);
  }
});

// ===== 초기화 =====

initializeIcons();
loadAuthState();
