import { elements } from "./dom.js";

let statusTimeoutId = null;

export function updateStatus(message, variant = "neutral", autoHide = true) {
  const { statusMessageDiv } = elements;
  if (!statusMessageDiv) return;

  statusMessageDiv.textContent = message;
  statusMessageDiv.classList.remove("success", "error");

  if (variant === "success") {
    statusMessageDiv.classList.add("success");
  } else if (variant === "error") {
    statusMessageDiv.classList.add("error");
  }

  statusMessageDiv.style.display = "block";
  window.clearTimeout(statusTimeoutId);
  if (autoHide) {
    statusTimeoutId = window.setTimeout(() => {
      statusMessageDiv.style.display = "none";
    }, 3500);
  }
}
