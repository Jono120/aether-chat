import { isNativeApp } from './platform.js';

/** Native shell setup: CSS class, splash screen, status bar styling. */
export async function initNativeShell() {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-shell');

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (err) {
    console.warn('SplashScreen hide failed', err);
  }
}
