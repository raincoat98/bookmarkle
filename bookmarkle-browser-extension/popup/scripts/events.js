import { dom } from "./dom.js";
import { getCurrentLanguage, applyLanguageUI, showToast } from "./locale.js";
import { toggleTheme } from "./theme.js";
import { loadCollections } from "./collections.js";
import { state } from "./state.js";
import { clearTags, addTag, addMultipleTags, removeTag } from "./tags.js";
import { updateUI, showLoading } from "./ui.js";
import { sanitizeInput, isValidCollectionName } from "../../utils/security.js";

export function bindPopupEvents({ publicSignUrl }) {
  if (dom.loginBtn) {
    dom.loginBtn.addEventListener("click", () => {
      // 로그인 버튼 클릭 시 로딩 표시
      showLoading();
      const dashboardUrl = `${publicSignUrl}&extensionId=${chrome.runtime.id}`;
      chrome.tabs.create({ url: dashboardUrl });

      // 팝업이 열려있는 동안 주기적으로 인증 상태 확인
      const checkAuthInterval = setInterval(async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: "GET_AUTH_STATE",
          });
          if (response?.user) {
            clearInterval(checkAuthInterval);
            updateUI(response.user);
          }
        } catch (error) {
          console.error("Auth check error:", error);
        }
      }, 1000);

      // 30초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkAuthInterval);
        if (!state.currentUser) {
          updateUI(null);
        }
      }, 30000);
    });
  }

  if (dom.saveBtn) {
    dom.saveBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url) {
        showToast("현재 탭 URL을 찾을 수 없습니다.", "error");
        return;
      }

      dom.saveBtn.disabled = true;
      const originalText = dom.saveBtnText?.textContent || "";

      // 보안: HTML에 미리 정의된 요소의 클래스만 변경
      if (dom.saveBtnText) dom.saveBtnText.classList.add("hidden");
      if (dom.saveBtnSpinner) dom.saveBtnSpinner.classList.remove("hidden");
      if (dom.saveBtnLoadingText)
        dom.saveBtnLoadingText.classList.remove("hidden");

      const selectedCollectionId = dom.dropdownSelected?.dataset.value || null;
      // 보안: 설명 입력 sanitization
      const rawDescription = dom.descriptionInput?.value || "";
      const description = sanitizeInput(rawDescription, 2000).trim();

      try {
        const response = await chrome.runtime.sendMessage({
          type: "SAVE_BOOKMARK",
          payload: {
            url: tab.url,
            title: tab.title || "",
            collectionId: selectedCollectionId,
            description,
            tags: state.tags,
            favicon: tab.favIconUrl || "",
          },
        });

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          showToast("북마크 저장 요청 실패", "error");
          dom.saveBtn.disabled = false;
          // 버튼 상태 복원
          if (dom.saveBtnText) dom.saveBtnText.classList.remove("hidden");
          if (dom.saveBtnSpinner) dom.saveBtnSpinner.classList.add("hidden");
          if (dom.saveBtnLoadingText)
            dom.saveBtnLoadingText.classList.add("hidden");
          return;
        }

        if (!response?.ok) {
          const errorMessage = response?.error || "북마크 저장 실패";
          showToast(errorMessage, "error");
          if (errorMessage.includes("로그인이 필요")) {
            updateUI(null);
          }
          dom.saveBtn.disabled = false;
          // 버튼 상태 복원
          if (dom.saveBtnText) dom.saveBtnText.classList.remove("hidden");
          if (dom.saveBtnSpinner) dom.saveBtnSpinner.classList.add("hidden");
          if (dom.saveBtnLoadingText)
            dom.saveBtnLoadingText.classList.add("hidden");
          return;
        }

        clearTags();
        if (dom.descriptionInput) dom.descriptionInput.value = "";

        if (dom.dropdownSelectedText) {
          const lang = getCurrentLanguage();
          dom.dropdownSelectedText.textContent =
            state.languageTexts[lang]?.collectionSelect || "컬렉션 선택...";
        }
        if (dom.dropdownSelected) {
          dom.dropdownSelected.dataset.value = "";
        }

        showToast("북마크가 저장되었습니다!", "success");
        setTimeout(() => {
          updateUI(state.currentUser, false);
          dom.saveBtn.disabled = false;
          // 버튼 상태 복원
          if (dom.saveBtnText) dom.saveBtnText.classList.remove("hidden");
          if (dom.saveBtnSpinner) dom.saveBtnSpinner.classList.add("hidden");
          if (dom.saveBtnLoadingText)
            dom.saveBtnLoadingText.classList.add("hidden");
        }, 1000);
      } catch (error) {
        console.error("Save error:", error);
        showToast("북마크 저장 오류", "error");
        dom.saveBtn.disabled = false;
        // 버튼 상태 복원
        if (dom.saveBtnText) dom.saveBtnText.classList.remove("hidden");
        if (dom.saveBtnSpinner) dom.saveBtnSpinner.classList.add("hidden");
        if (dom.saveBtnLoadingText)
          dom.saveBtnLoadingText.classList.add("hidden");
      }
    });
  }

  if (dom.dropdownSelected && dom.dropdownOptions) {
    dom.dropdownSelected.addEventListener("click", () => {
      dom.dropdownOptions.classList.toggle("hidden");
      dom.dropdownSelected.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!dom.collectionDropdown?.contains(e.target)) {
        dom.dropdownOptions.classList.add("hidden");
        dom.dropdownSelected.classList.remove("active");
      }
    });
  }

  if (dom.cancelCollectionBtn && dom.addCollectionModal) {
    dom.cancelCollectionBtn.addEventListener("click", () => {
      dom.addCollectionModal.classList.add("hidden");
    });
  }

  if (dom.confirmCollectionBtn) {
    dom.confirmCollectionBtn.addEventListener("click", async () => {
      // 보안: 입력 sanitization
      const rawName = dom.collectionNameInput?.value || "";
      const name = sanitizeInput(rawName, 100).trim();
      let icon =
        sanitizeInput(dom.collectionIconInput?.value || "📁", 50).trim() ||
        "📁";

      // 보안: 컬렉션 이름 검증
      if (!isValidCollectionName(name)) {
        showToast("컬렉션 이름이 유효하지 않습니다.", "error");
        return;
      }

      if (icon) {
        const emojiArr = Array.from(
          icon.matchAll(/\p{Extended_Pictographic}/gu),
          (m) => m[0]
        );
        if (emojiArr.length > 0) {
          icon = emojiArr[emojiArr.length - 1];
        } else {
          icon = icon[icon.length - 1];
        }
      }

      if (!name) {
        showToast("컬렉션 이름을 입력하세요.", "error");
        return;
      }

      dom.confirmCollectionBtn.disabled = true;
      dom.confirmCollectionBtn.textContent = "추가 중...";
      try {
        const response = await chrome.runtime.sendMessage({
          type: "ADD_COLLECTION",
          payload: { name, icon },
        });
        if (response?.ok) {
          showToast("컬렉션이 추가되었습니다!", "success");
          dom.addCollectionModal?.classList.add("hidden");
          await loadCollections();
        } else {
          showToast(response?.error || "컬렉션 추가 실패", "error");
        }
      } catch (error) {
        showToast("컬렉션 추가 오류", "error");
      } finally {
        dom.confirmCollectionBtn.disabled = false;
        const lang = getCurrentLanguage();
        dom.confirmCollectionBtn.textContent =
          state.languageTexts[lang]?.addBtn || "추가";
      }
    });
  }

  if (dom.collectionIconInput) {
    dom.collectionIconInput.addEventListener("input", (e) => {
      const input = e.target;
      if (input && typeof input.value === "string") {
        const emojiArr = Array.from(
          input.value.matchAll(/\p{Extended_Pictographic}/gu),
          (m) => m[0]
        );
        if (emojiArr.length > 0) {
          input.value = emojiArr[emojiArr.length - 1];
        } else if (input.value.length > 1) {
          input.value = input.value[input.value.length - 1];
        }
      }
    });
  }

  if (dom.tagInput) {
    dom.tagInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        const value = dom.tagInput.value.trim();
        if (value) {
          if (value.includes(",")) {
            addMultipleTags(value);
          } else {
            addTag(value);
          }
          dom.tagInput.value = "";
        }
      }
    });

    dom.tagInput.addEventListener("input", (e) => {
      const value = e.target.value;
      if (value.includes(",")) {
        const parts = value.split(",");
        for (let i = 0; i < parts.length - 1; i++) {
          addTag(parts[i]);
        }
        e.target.value = parts[parts.length - 1];
      }
    });
  }

  if (dom.tagsDisplay) {
    dom.tagsDisplay.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-remove")) {
        const tagToRemove = e.target.getAttribute("data-tag");
        removeTag(tagToRemove);
      }
    });
  }

  if (dom.themeToggle && !dom.themeToggle._themeHandlerAdded) {
    dom.themeToggle.addEventListener("click", toggleTheme);
    dom.themeToggle._themeHandlerAdded = true;
  }

  if (dom.languageSettingsBtn) {
    dom.languageSettingsBtn.addEventListener("click", () => {
      dom.languageModal?.classList.remove("hidden");
    });
  }

  if (dom.languageCancelBtn) {
    dom.languageCancelBtn.addEventListener("click", () => {
      dom.languageModal?.classList.add("hidden");
    });
  }

  if (dom.languageSaveBtn) {
    dom.languageSaveBtn.addEventListener("click", () => {
      const selected = document.querySelector('input[name="language"]:checked');
      if (selected) {
        localStorage.setItem("language", selected.value);
        applyLanguageUI(selected.value);
      }
      dom.languageModal?.classList.add("hidden");
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "AUTH_STATE_CHANGED") {
      updateUI(msg.user);
    }
    if (msg.type === "COLLECTIONS_UPDATED") {
      loadCollections();
    }
  });
}
