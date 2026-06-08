export const CLIENT_PLATFORM_HEADER = 'X-Aether-Client';

/** True when running inside a Capacitor native shell. */
export function isNativeApp() {
  return window.Capacitor?.isNativePlatform?.() === true;
}

/** True for standard browser sessions (default until a native wrapper sets Capacitor). */
export function isWebBrowser() {
  return !isNativeApp();
}

/** Value for the X-Aether-Client request header. */
export function clientPlatformHeaderValue() {
  return isNativeApp() ? 'native' : 'web';
}
