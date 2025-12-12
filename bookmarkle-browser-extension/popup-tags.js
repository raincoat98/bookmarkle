import { dom } from "./popup-dom.js";
import { state } from "./popup-state.js";

export function addTag(tag) {
  const trimmed = tag.trim();
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
    const tagElement = document.createElement("span");
    tagElement.className = "tag-item";
    tagElement.innerHTML = `
      ${tag}
      <span class="tag-remove" data-tag="${tag}">×</span>
    `;
    dom.tagsDisplay.appendChild(tagElement);
  });
}
