import { initContextMenus } from "./context-menus.js";
import { initMessageHandlers } from "./messaging.js";
import { initQuickModeControls } from "./quick-mode.js";
import { initQuickSave } from "./quick-save.js";

initQuickModeControls();
initContextMenus();
initMessageHandlers();
initQuickSave();
