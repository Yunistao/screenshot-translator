import { globalShortcut } from 'electron';

export const registerGlobalShortcut = (key: string, callback: () => void): boolean => {
  return globalShortcut.register(key, callback);
};

export const unregisterGlobalShortcut = (key: string): void => {
  globalShortcut.unregister(key);
};

export const unregisterAllShortcuts = (): void => {
  globalShortcut.unregisterAll();
};