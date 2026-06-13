import { create } from "zustand";

interface DrawerState {
  isDrawerOpen: boolean;
  isDrawerClosing: boolean;
  isDrawerCollapsed: boolean;
}

interface DrawerActions {
  setIsDrawerOpen: (isOpen: boolean) => void;
  setIsDrawerClosing: (isClosing: boolean) => void;
  setIsDrawerCollapsed: (isCollapsed: boolean) => void;
  toggleDrawer: () => void;
  closeDrawer: () => void;
  openDrawer: () => void;
}

export const useDrawerStore = create<DrawerState & DrawerActions>(
  (set, get) => ({
    // State
    isDrawerOpen: false,
    isDrawerClosing: false,
    isDrawerCollapsed: false,

    // Actions
    setIsDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
    setIsDrawerClosing: (isClosing) => set({ isDrawerClosing: isClosing }),
    setIsDrawerCollapsed: (isCollapsed) =>
      set({ isDrawerCollapsed: isCollapsed }),

    toggleDrawer: () => {
      const { isDrawerOpen } = get();
      set({ isDrawerOpen: !isDrawerOpen });
    },

    closeDrawer: () => {
      set({ isDrawerOpen: false });
    },

    openDrawer: () => {
      set({ isDrawerOpen: true });
    },
  })
);
