import { defineStore } from 'pinia'

export const themeStorageKey = 'gt-color-theme'
export function initialTheme() {
  try {
    const saved = localStorage.getItem(themeStorageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* Private browsing can disable local storage. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}
export function initializeTheme() {
  document.documentElement.dataset.theme = initialTheme()
}
export const useTheme = defineStore('theme', {
  state: () => ({ mode: document.documentElement.dataset.theme || initialTheme() }),
  actions: {
    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = this.mode
      try { localStorage.setItem(themeStorageKey, this.mode) } catch { /* Keep the current session usable. */ }
    },
  },
})
