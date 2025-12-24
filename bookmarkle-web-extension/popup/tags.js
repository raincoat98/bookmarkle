import { elements } from "./dom.js";

let tags = [];
let isProcessingTag = false;
let isComposing = false;

export function getTags() {
  return [...tags];
}

export function setTags(newTags) {
  tags = [...newTags];
  renderTags();
}

export function clearTags() {
  tags = [];
  renderTags();
}

function renderTags() {
  const { tagList } = elements;
  if (!tagList) return;

  tagList.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = tag;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      tags = tags.filter((item) => item !== tag);
      renderTags();
    });
    chip.appendChild(nameSpan);
    chip.appendChild(removeBtn);
    tagList.appendChild(chip);
  });
}

export function addTagsFromInput(value) {
  if (!value) return;
  const trimmedValue = value.trim();
  if (!trimmedValue) return;

  const rawTags = trimmedValue
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  let added = false;
  rawTags.forEach((tag) => {
    if (!tags.includes(tag)) {
      tags.push(tag);
      added = true;
    }
  });
  if (added) {
    renderTags();
  }
}

export function initializeTagInput() {
  const { tagInput } = elements;
  if (!tagInput) return;

  tagInput.addEventListener("compositionstart", () => {
    isComposing = true;
  });

  tagInput.addEventListener("compositionend", () => {
    isComposing = false;
  });

  tagInput.addEventListener("keydown", (event) => {
    if (isComposing) return;

    if (event.key === "Enter") {
      event.preventDefault();
      if (isProcessingTag) return;
      isProcessingTag = true;
      const value = tagInput.value.trim();
      if (value) {
        addTagsFromInput(value);
        tagInput.value = "";
      }
      setTimeout(() => {
        isProcessingTag = false;
      }, 100);
    } else if (event.key === ",") {
      event.preventDefault();
      if (isProcessingTag) return;
      isProcessingTag = true;
      const value = tagInput.value.trim();
      if (value) {
        addTagsFromInput(value);
        tagInput.value = "";
      }
      setTimeout(() => {
        isProcessingTag = false;
      }, 100);
    }
  });

  tagInput.addEventListener("blur", () => {
    if (isProcessingTag || isComposing) return;
    const value = tagInput.value.trim();
    if (value) {
      addTagsFromInput(value);
      tagInput.value = "";
    }
  });
}
