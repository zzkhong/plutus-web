/** The slice of Telegram's Mini App SDK (telegram-web-app.js) this app uses. */

export interface TelegramWebApp {
  initData: string;
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  onEvent(event: 'themeChanged', handler: () => void): void;
  offEvent(event: 'themeChanged', handler: () => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  return typeof window === 'undefined' ? null : (window.Telegram?.WebApp ?? null);
}
