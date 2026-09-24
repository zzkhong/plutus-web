'use client';

import { useEffect, useState } from 'react';
import type { ApiClient } from '@/lib/api';
import { dayKey, formatAmountWithSgd, formatDay } from '@/lib/format';
import { CATEGORIES, type Transaction, type TransactionPage } from '@/lib/types';
import { useLoad } from '@/lib/use-api';

const SOURCE_LABELS: Record<string, string> = {
  text: 'Chat',
  voice: 'Voice',
  receipt: 'Receipt',
  apple_pay: 'Apple Pay',
  recurring: 'Recurring',
  split: 'Split',
};

export function Transactions({ client }: { client: ApiClient }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <>
      <div className="filters">
        <input
          type="search"
          placeholder="Search merchant"
          aria-label="Search merchant"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {/* Remounting on a new filter drops pages loaded for the old one. */}
      <TransactionList key={`${query}|${category}`} client={client} query={query} category={category} />
    </>
  );
}

function TransactionList({ client, query, category }: { client: ApiClient; query: string; category: string }) {
  const first = useLoad(`transactions:${query}|${category}`, () =>
    client.get<TransactionPage>('transactions', { q: query, category }),
  );
  const [more, setMore] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  if (first.state === 'loading') {
    return (
      <div className="rows" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ margin: '16px 0' }} />
        ))}
      </div>
    );
  }
  if (first.state === 'error') {
    return <div className="card error">{first.message}</div>;
  }

  const rows = [...first.data.transactions, ...more];
  const nextCursor = cursor === undefined ? first.data.nextCursor : cursor;

  const loadMore = async () => {
    if (!nextCursor) {
      return;
    }
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await client.get<TransactionPage>('transactions', { q: query, category, cursor: nextCursor });
      setMore((existing) => [...existing, ...page.transactions]);
      setCursor(page.nextCursor);
    } catch (error) {
      setMoreError(error instanceof Error ? error.message : 'Could not load more');
    } finally {
      setLoadingMore(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="card muted small">
        {query || category ? 'No expenses match.' : 'No expenses yet. Tell the bot what you spend and it shows up here.'}
      </div>
    );
  }

  return (
    <>
      {groupByDay(rows).map(([day, dayRows]) => (
        <section key={day} className="day-group">
          <h3>{formatDay(dayRows[0].spentAt)}</h3>
          <ul className="rows">
            {dayRows.map((row) => (
              <li key={row.id} className="row">
                <div className="row-main">
                  <div className="row-title">{row.merchant}</div>
                  <div className="muted small">
                    {row.category} · {SOURCE_LABELS[row.source] ?? row.source}
                    {row.note ? ` · ${row.note}` : ''}
                  </div>
                </div>
                <div className="row-amount num">{formatAmountWithSgd(row.amount, row.currency, row.amountSgd)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {moreError && <p className="error small">{moreError}</p>}
      {nextCursor && (
        <button className="button" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </>
  );
}

/** Consecutive rows by their Singapore day; rows arrive newest spent first. */
function groupByDay(rows: Transaction[]): Array<[string, Transaction[]]> {
  const groups: Array<[string, Transaction[]]> = [];
  for (const row of rows) {
    const key = dayKey(row.spentAt);
    const last = groups[groups.length - 1];
    if (last && last[0] === key) {
      last[1].push(row);
    } else {
      groups.push([key, [row]]);
    }
  }
  return groups;
}
