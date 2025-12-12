import { includeHTML } from "./popup-include.js";

await includeHTML();
await import("./popup-simple.js");
