import { Platform, requireNativeModule } from 'expo-modules-core';

interface WidgetStorageNativeModule {
  setWidgetData(json: string): boolean;
  clearWidgetData(): boolean;
  reloadWidgets(): void;
}

let nativeModule: WidgetStorageNativeModule | null = null;

function getModule(): WidgetStorageNativeModule | null {
  if (Platform.OS !== 'ios') return null;
  if (nativeModule) return nativeModule;
  try {
    nativeModule = requireNativeModule<WidgetStorageNativeModule>('WidgetStorage');
    return nativeModule;
  } catch {
    return null;
  }
}

export function setWidgetData(payload: unknown): boolean {
  const mod = getModule();
  if (!mod) return false;
  try {
    return mod.setWidgetData(JSON.stringify(payload));
  } catch {
    return false;
  }
}

export function clearWidgetData(): boolean {
  const mod = getModule();
  if (!mod) return false;
  return mod.clearWidgetData();
}

export function reloadWidgets(): void {
  const mod = getModule();
  mod?.reloadWidgets();
}
