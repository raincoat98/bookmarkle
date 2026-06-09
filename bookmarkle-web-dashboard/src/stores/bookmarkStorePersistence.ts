import { createJSONStorage } from "zustand/middleware";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

export const dateAwareStorage = createJSONStorage(() => sessionStorage, {
  reviver: (_key, value) => {
    if (typeof value === "string" && ISO_DATE_RE.test(value)) {
      return new Date(value);
    }
    return value;
  },
});
