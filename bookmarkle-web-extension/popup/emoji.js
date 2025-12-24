import { Picker } from "emoji-mart";
import data from "@emoji-mart/data";
import { elements } from "./dom.js";

let emojiPickerInstance = null;

async function initializeEmojiPicker() {
  const { emojiPickerContainer } = elements;
  if (!emojiPickerContainer || emojiPickerInstance) return;

  try {
    emojiPickerInstance = new Picker({
      data: data,
      onEmojiSelect: (emoji) => {
        const { collectionModalIconInput } = elements;
        if (collectionModalIconInput) {
          collectionModalIconInput.value = emoji.native;
          collectionModalIconInput.dispatchEvent(new Event("input"));
        }
        hideEmojiPicker();
      },
      onClickOutside: () => {
        hideEmojiPicker();
      },
      locale: "ko",
      theme: "dark",
      previewPosition: "none",
      skinTonePosition: "none",
    });

    emojiPickerContainer.appendChild(emojiPickerInstance);
  } catch (error) {
    console.error("이모지 picker 초기화 실패:", error);
  }
}

export async function showEmojiPicker() {
  const { emojiPickerModal, emojiPickerContainer } = elements;
  if (!emojiPickerModal || !emojiPickerContainer) return;

  if (!emojiPickerInstance) {
    await initializeEmojiPicker();
  }

  if (emojiPickerModal) {
    const isVisible = emojiPickerModal.classList.contains("show");
    if (isVisible) {
      emojiPickerModal.classList.remove("show");
    } else {
      emojiPickerModal.classList.add("show");
    }
  }
}

export function hideEmojiPicker() {
  const { emojiPickerModal } = elements;
  if (emojiPickerModal) {
    emojiPickerModal.classList.remove("show");
  }
}
