'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiClient, ApiError } from '@/lib/api';
import { getWebApp } from '@/lib/telegram';
import type { SessionUser } from '@/lib/types';
import { Admin } from './Admin';
import { Overview } from './Overview';
import { Transactions } from './Transactions';

type Tab = 'overview' | 'transactions' | 'admin';

type SignIn = { state: 'pending' } | { state: 'ready'; user: SessionUser } | { state: 'failed'; error: ApiError | Error };

export function MiniApp() {
  const [webApp] = useState(getWebApp);
  const initData = webApp?.initData ?? '';
  const client = useMemo(() => (initData ? new ApiClient(initData) : null), [initData]);
  const [signIn, setSignIn] = useState<SignIn>({ state: 'pending' });
  const [tab, setTab] = useState<Tab>('overview');

  // Follow the chat's light/dark theme; the SDK supplies the colors themselves.
  useEffect(() => {
    if (!webApp) {
      return;
    }
    const applyTheme = () => {
      document.documentElement.dataset.theme = webApp.colorScheme;
    };
    applyTheme();
    webApp.ready();
    webApp.expand();
    webApp.onEvent('themeChanged', applyTheme);
    return () => webApp.offEvent('themeChanged', applyTheme);
  }, [webApp]);

  useEffect(() => {
    client?.signIn().then(
      (session) => setSignIn({ state: 'ready', user: session.user }),
      (error: Error) => setSignIn({ state: 'failed', error }),
    );
  }, [client]);

  if (!client) {
    return (
      <Notice title="Open Plutus from Telegram">
        This dashboard signs you in with your Telegram account. Open it from the <b>Dashboard</b> button in your chat
        with the Plutus bot.
      </Notice>
    );
  }

  if (signIn.state === 'pending') {
    return (
      <main className="app" aria-busy="true">
        <div className="card">
          <div className="skeleton" style={{ width: '40%' }} />
          <div className="skeleton" style={{ width: '70%', height: 28 }} />
        </div>
      </main>
    );
  }

  if (signIn.state === 'failed') {
    const status = signIn.error instanceof ApiError ? signIn.error.status : 0;
    if (status === 403) {
      return (
        <Notice title="No Plutus account yet">
          Send <b>/setup</b> to the Plutus bot to register. Once an admin approves you, your dashboard appears here.
        </Notice>
      );
    }
    if (status === 401) {
      return <Notice title="Sign-in expired">Close this window and open the dashboard from the bot again.</Notice>;
    }
    return (
      <Notice title="Plutus is unavailable">
        <span className="error">{signIn.error.message}</span>
        <br />
        Try again in a moment.
      </Notice>
    );
  }

  const tabs: Array<[Tab, string]> = [
    ['overview', 'Overview'],
    ['transactions', 'Expenses'],
    ...(signIn.user.isAdmin ? ([['admin', 'Admin']] as Array<[Tab, string]>) : []),
  ];

  return (
    <main className="app">
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className="tab"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div id={`panel-${tab}`} role="tabpanel">
        {tab === 'overview' && <Overview client={client} />}
        {tab === 'transactions' && <Transactions client={client} />}
        {tab === 'admin' && <Admin client={client} />}
      </div>
    </main>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="app">
      <div className="card notice">
        <h1>{title}</h1>
        <p className="muted">{children}</p>
      </div>
    </main>
  );
}
