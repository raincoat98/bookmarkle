import { restoreAuthFromStorage } from "./background-auth.js";
import { initContextMenus } from "./background-context-menus.js";
import { initMessageHandlers } from "./background-messaging.js";
import { initQuickModeControls } from "./background-quick-mode.js";
import { initQuickSave } from "./background-quick-save.js";

restoreAuthFromStorage();
initQuickModeControls();
initContextMenus();
initMessageHandlers();
initQuickSave();
