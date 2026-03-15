import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';

export type Platform = 'native-ios' | 'native-android' | 'telegram' | 'pwa' | 'browser';

export function getPlatform(): Platform {
  if (Capacitor.isNativePlatform()) {
    return Capacitor.getPlatform() === 'ios' ? 'native-ios' : 'native-android';
  }
  if (window.Telegram?.WebApp?.initData) {
    return 'telegram';
  }
  if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
    return 'pwa';
  }
  return 'browser';
}

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initNativeApp() {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0f0f23' });
  } catch {}

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {}

  try {
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-visible');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-visible');
    });
  } catch {}

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  });

  App.addListener('appUrlOpen', ({ url }) => {
    const slug = url.split('honeycomb://').pop();
    if (slug) {
      window.location.hash = slug;
    }
  });
}

export async function nativeHaptic(style: 'light' | 'medium' | 'heavy' = 'medium') {
  if (!isNative()) {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    } catch {}
    return;
  }
  try {
    const map: Record<string, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] || ImpactStyle.Medium });
  } catch {}
}

export async function nativeNotify(type: 'success' | 'error' | 'warning' = 'success') {
  if (!isNative()) {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    } catch {}
    return;
  }
  try {
    const map: Record<string, NotificationType> = {
      success: NotificationType.Success,
      error: NotificationType.Error,
      warning: NotificationType.Warning,
    };
    await Haptics.notification({ type: map[type] || NotificationType.Success });
  } catch {}
}

export async function nativeSelectionClick() {
  if (!isNative()) return;
  try {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  } catch {}
}
