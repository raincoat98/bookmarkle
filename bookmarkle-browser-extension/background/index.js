import { restoreAuthFromStorage } from "./auth.js";
import { initContextMenus } from "./context-menus.js";
import { initMessageHandlers } from "./messaging.js";
import { initQuickModeControls } from "./quick-mode.js";
import { initQuickSave } from "./quick-save.js";

restoreAuthFromStorage();
initQuickModeControls();
initContextMenus();
initMessageHandlers();
initQuickSave();
