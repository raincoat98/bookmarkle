import { dom } from "./popup-dom.js";
import { state } from "./popup-state.js";
import { getCurrentLanguage } from "./popup-locale.js";

let loginRequiredHandler = () => {};

export function setLoginRequiredHandler(handler) {
  loginRequiredHandler = handler;
}

export async function loadCollections() {
  if (state.isLoadingCollections) {
    console.log("⏳ Collections already loading, skip");
    return;
  }

  state.isLoadingCollections = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_COLLECTIONS" });

    if (response?.ok && response.collections) {
      state.collections = response.collections;
      updateCollectionSelect();
      console.log("✅ Collections loaded:", state.collections.length);
    } else if (!response?.ok && response?.error?.includes("로그인이 필요")) {
      loginRequiredHandler();
    }
  } catch (error) {
    console.error("Failed to load collections:", error);
  } finally {
    state.isLoadingCollections = false;
  }
}

export function updateCollectionSelect(selectedId = "") {
  if (!dom.dropdownOptions) return;
  dom.dropdownOptions.innerHTML = "";

  state.collections.forEach((collection) => {
    const option = document.createElement("div");
    option.className = "dropdown-option" + (selectedId === collection.id ? " selected" : "");
    option.dataset.value = collection.id;
    option.innerHTML = `<span>${collection.icon || "📁"}</span> <span>${collection.name}</span>`;
    option.addEventListener("click", () => {
      if (dom.dropdownSelectedText) {
        dom.dropdownSelectedText.textContent = `${collection.icon || "📁"} ${collection.name}`;
      }
      dom.dropdownOptions.classList.add("hidden");
      dom.dropdownSelected?.classList.remove("active");
      if (dom.dropdownSelected) {
        dom.dropdownSelected.dataset.value = collection.id;
      }
    });
    dom.dropdownOptions.appendChild(option);
  });

  const addOption = document.createElement("div");
  addOption.className = "dropdown-option add";
  addOption.dataset.value = "__add_collection__";
  const lang = getCurrentLanguage();
  addOption.textContent =
    state.languageTexts[lang]?.addCollectionOption || "+ 새 컬렉션 추가";
  addOption.addEventListener("click", () => {
    dom.dropdownOptions?.classList.add("hidden");
    dom.dropdownSelected?.classList.remove("active");
    dom.addCollectionModal?.classList.remove("hidden");
    if (dom.collectionNameInput) dom.collectionNameInput.value = "";
    if (dom.collectionIconInput) dom.collectionIconInput.value = "📁";
  });
  dom.dropdownOptions.appendChild(addOption);
}
