import { dom } from "./dom.js";
import { state } from "./state.js";
import { getCurrentLanguage } from "./locale.js";
import { escapeHtml } from "../../utils/security.js";

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
    const response = await chrome.runtime.sendMessage({
      type: "GET_COLLECTIONS",
    });

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
    option.className =
      "dropdown-option" + (selectedId === collection.id ? " selected" : "");
    option.dataset.value = collection.id;

    const iconNode = createIconNode(collection.icon);
    iconNode.classList.add("mr-2");
    const nameNode = document.createElement("span");
    nameNode.textContent = collection.name;
    option.appendChild(iconNode);
    option.appendChild(nameNode);

    option.addEventListener("click", () => {
      if (dom.dropdownSelectedText) {
        // 보안: XSS 방지 - innerHTML 대신 안전한 방법 사용
        dom.dropdownSelectedText.innerHTML = "";
        const selectedIcon = createIconNode(collection.icon);
        selectedIcon.classList.add("mr-1");
        dom.dropdownSelectedText.appendChild(selectedIcon);
        // 보안: 텍스트 노드로 안전하게 추가
        dom.dropdownSelectedText.appendChild(
          document.createTextNode(collection.name)
        );
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
  dom.dropdownOptions.prepend(addOption);
}

function createIconNode(iconValue) {
  const container = document.createElement("span");
  container.className = "collection-icon";
  const iconText = iconValue?.trim();
  if (!iconText) {
    container.textContent = "📁";
    return container;
  }

  const lucideLib = window.lucide;
  if (lucideLib?.icons?.[iconText]) {
    const svg = lucideLib.createElement(lucideLib.icons[iconText], {
      width: 16,
      height: 16,
    });
    svg.classList.add("lucide");
    container.appendChild(svg);
    return container;
  }

  container.textContent = iconText;
  return container;
}
