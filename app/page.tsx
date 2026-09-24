'use client';

import dynamic from 'next/dynamic';

// Client-only: everything depends on window.Telegram, which the server doesn't have.
const MiniApp = dynamic(() => import('@/components/MiniApp').then((mod) => mod.MiniApp), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  return <MiniApp />;
}
