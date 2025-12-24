import { elements } from "./dom.js";
import { isUserLoggedIn } from "./auth.js";

export function setCollectionControlsState() {
  const disabled = !isUserLoggedIn();
  const { collectionInput, refreshCollectionsBtn, newCollectionBtn } = elements;
  if (collectionInput) collectionInput.disabled = disabled;
  if (refreshCollectionsBtn) refreshCollectionsBtn.disabled = disabled;
  if (newCollectionBtn) newCollectionBtn.disabled = disabled;
}
