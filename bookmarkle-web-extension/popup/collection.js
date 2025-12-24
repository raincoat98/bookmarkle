import { elements } from "./dom.js";
import { t } from "./i18n.js";
import { updateStatus } from "./status.js";
import { hideEmojiPicker } from "./emoji.js";

let collections = [];
let filteredCollections = [];
let userIsLoggedIn = false;

export function setUserLoggedIn(isLoggedIn) {
  userIsLoggedIn = isLoggedIn;
}

export function getCollections() {
  return collections;
}

export async function updateCollectionsList(newCollections = []) {
  collections = newCollections;
  await filterCollections("");
}

export async function filterCollections(searchText = "") {
  const { collectionDropdownList, collectionCreateOption, newCollectionName } =
    elements;
  const search = searchText.trim().toLowerCase();
  filteredCollections = search
    ? collections.filter((col) => col.name.toLowerCase().includes(search))
    : collections;

  if (collectionDropdownList) {
    collectionDropdownList.innerHTML = "";

    if (!search) {
      const noneItem = document.createElement("div");
      noneItem.className = "collection-dropdown-item";
      noneItem.textContent = await t("collection.selectNone");
      noneItem.addEventListener("click", () => {
        clearCollection();
      });
      collectionDropdownList.appendChild(noneItem);
    }

    if (filteredCollections.length > 0) {
      filteredCollections.forEach((collection) => {
        const item = document.createElement("div");
        item.className = "collection-dropdown-item";
        if (collection.icon) {
          item.innerHTML = `<span style="margin-right: 6px;">${collection.icon}</span>${collection.name}`;
        } else {
          item.textContent = collection.name;
        }
        item.addEventListener("click", () => {
          selectCollection(collection);
        });
        collectionDropdownList.appendChild(item);
      });
    } else if (search) {
      const noResult = document.createElement("div");
      noResult.className = "collection-dropdown-item";
      noResult.style.color = "rgba(255, 255, 255, 0.5)";
      noResult.style.cursor = "default";
      noResult.textContent = await t("collection.noResults");
      collectionDropdownList.appendChild(noResult);
    }
  }

  if (collectionCreateOption && newCollectionName) {
    const exactMatch = collections.some(
      (col) => col.name.toLowerCase() === search
    );

    if (search && !exactMatch) {
      newCollectionName.textContent = searchText.trim();
      collectionCreateOption.style.display = "block";
    } else {
      collectionCreateOption.style.display = "none";
    }
  }
}

export function showCollectionDropdown() {
  const { collectionDropdown, collectionSearchInput } = elements;
  if (collectionDropdown) {
    collectionDropdown.style.display = "flex";
    if (collectionSearchInput) {
      collectionSearchInput.value = "";
      collectionSearchInput.focus();
      filterCollections("");
    }
  }
}

export function hideCollectionDropdown() {
  const { collectionDropdown, collectionSearchInput } = elements;
  if (collectionDropdown) {
    collectionDropdown.style.display = "none";
    if (collectionSearchInput) {
      collectionSearchInput.value = "";
    }
  }
}

export function selectCollection(collection) {
  const { collectionInput, selectedCollectionId } = elements;
  if (collectionInput) {
    collectionInput.value = collection.icon
      ? `${collection.icon} ${collection.name}`
      : collection.name;
  }
  if (selectedCollectionId) {
    selectedCollectionId.value = collection.id;
  }
  hideCollectionDropdown();
}

export function clearCollection() {
  const { collectionInput, selectedCollectionId } = elements;
  if (collectionInput) {
    collectionInput.value = "";
  }
  if (selectedCollectionId) {
    selectedCollectionId.value = "";
  }
  hideCollectionDropdown();
}

export function showCollectionModal(initialName = "") {
  const {
    collectionModal,
    collectionModalInput,
    collectionModalIconInput,
    collectionDropdown,
  } = elements;
  if (collectionModal) {
    if (collectionModalInput) {
      collectionModalInput.value = initialName;
      collectionModalInput.focus();
    }
    if (collectionModalIconInput) {
      collectionModalIconInput.value = "";
    }
    collectionModal.classList.add("show");
    if (collectionDropdown) {
      collectionDropdown.style.display = "none";
    }
    hideEmojiPicker();
  }
}

export function closeCollectionModal() {
  const { collectionModal, collectionModalInput, collectionModalIconInput } =
    elements;
  if (collectionModal) {
    collectionModal.classList.remove("show");
    if (collectionModalInput) {
      collectionModalInput.value = "";
    }
    if (collectionModalIconInput) {
      collectionModalIconInput.value = "";
    }
    hideEmojiPicker();
  }
}

export async function createCollectionFromModal() {
  const {
    collectionModalInput,
    collectionModalIconInput,
    collectionModalCreateBtn,
  } = elements;
  const name = collectionModalInput?.value?.trim();
  if (!name) {
    updateStatus(await t("common.collectionNameRequired"), "error");
    return;
  }

  const icon = collectionModalIconInput?.value?.trim() || "Folder";

  const existingCollection = collections.find(
    (col) => col.name.toLowerCase() === name.toLowerCase()
  );

  if (existingCollection) {
    updateStatus(await t("common.collectionExists"), "error");
    selectCollection(existingCollection);
    closeCollectionModal();
    return;
  }

  if (collectionModalCreateBtn) {
    collectionModalCreateBtn.disabled = true;
    collectionModalCreateBtn.textContent = await t("collection.creating");
  }

  try {
    const createResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "CREATE_COLLECTION",
          collectionData: { name: name, icon: icon },
        },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });

    if (createResponse?.success && createResponse?.collectionId) {
      await fetchCollectionsList();

      const newCollection = collections.find(
        (col) => col.id === createResponse.collectionId
      );
      if (newCollection) {
        selectCollection(newCollection);
      }

      updateStatus(await t("common.collectionCreated"), "success");
      closeCollectionModal();
    } else {
      updateStatus(
        createResponse?.error || (await t("common.collectionCreateError")),
        "error"
      );
    }
  } catch (error) {
    console.error("컬렉션 생성 실패:", error);
    updateStatus(await t("common.collectionCreateError"), "error");
  } finally {
    if (collectionModalCreateBtn) {
      collectionModalCreateBtn.disabled = false;
      collectionModalCreateBtn.textContent = await t("collection.create");
    }
  }
}

export function fetchCollectionsList() {
  return new Promise((resolve) => {
    if (!userIsLoggedIn) {
      updateCollectionsList([]);
      resolve();
      return;
    }

    chrome.runtime.sendMessage(
      { type: "FETCH_COLLECTIONS" },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error("컬렉션 목록 로드 오류:", chrome.runtime.lastError);
          updateStatus(await t("common.collectionListError"), "error");
          resolve();
          return;
        }

        if (response?.success && Array.isArray(response.collections)) {
          await updateCollectionsList(response.collections);
        } else {
          const errorMsg =
            response?.error || (await t("common.collectionLoadError"));
          updateStatus(errorMsg, "error");
          await updateCollectionsList([]);
        }
        resolve();
      }
    );
  });
}
