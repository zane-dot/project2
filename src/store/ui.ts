import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

type UiState = {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const next: Theme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        applyTheme(next);
      },
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'hk-pulse-ui',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
