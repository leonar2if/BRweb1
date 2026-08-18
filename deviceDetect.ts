/** Detecta si el navegador se está ejecutando en un dispositivo Android. */
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** Detecta iOS (útil si en el futuro se quiere mostrar un banner distinto para iPhone/App Store). */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getAndroidDownloadUrl(): string {
  return import.meta.env.VITE_ANDROID_DOWNLOAD_URL || '';
}

/** Puerto de NetworkUtils.kt: si hay conexión antes de intentar un refresco. */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined' || navigator.onLine === undefined) return true;
  return navigator.onLine;
}
