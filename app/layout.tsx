import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plutus',
  description: 'Your Plutus spending, budgets and portfolio — the dashboard for the Plutus AI Telegram bot.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-SG" suppressHydrationWarning>
      <head>
        {/* Telegram's Mini App SDK: initData for sign-in, and the chat's theme as --tg-theme-* variables. */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
