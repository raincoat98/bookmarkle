import { dom } from "./dom.js";
import { state } from "./state.js";
import { isValidTag, escapeHtml } from "../../utils/security.js";

export function addTag(tag) {
  const trimmed = tag.trim();

  // 보안: 태그 검증
  if (!isValidTag(trimmed)) {
    console.warn("⚠️ Invalid tag:", trimmed);
    return;
  }

  if (trimmed && !state.tags.includes(trimmed)) {
    state.tags.push(trimmed);
    renderTags();
  }
}

export function addMultipleTags(input) {
  const newTags = input
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !state.tags.includes(t));

  if (newTags.length > 0) {
    state.tags.push(...newTags);
    renderTags();
  }
}

export function removeTag(tagToRemove) {
  state.tags = state.tags.filter((tag) => tag !== tagToRemove);
  renderTags();
}

export function clearTags() {
  state.tags = [];
  renderTags();
}

export function renderTags() {
  if (!dom.tagsDisplay) return;
  dom.tagsDisplay.innerHTML = "";
  state.tags.forEach((tag) => {
    // 보안: XSS 방지 - innerHTML 대신 안전한 방법 사용
    const tagElement = document.createElement("span");
    tagElement.className = "tag-item";

    // 태그 텍스트 (이스케이프)
    const tagText = document.createTextNode(tag);
    tagElement.appendChild(tagText);

    // 제거 버튼
    const removeBtn = document.createElement("span");
    removeBtn.className = "tag-remove";
    removeBtn.setAttribute("data-tag", escapeHtml(tag));
    removeBtn.textContent = "×";
    tagElement.appendChild(removeBtn);

    dom.tagsDisplay.appendChild(tagElement);
  });
}
