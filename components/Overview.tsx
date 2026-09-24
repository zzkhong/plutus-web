'use client';

import { useState } from 'react';
import type { ApiClient } from '@/lib/api';
import { formatMoney, formatMonthLabel, formatPercent, monthKeyOf, shiftMonth } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { useLoad } from '@/lib/use-api';
import { CategoryChart } from './CategoryChart';

export function Overview({ client }: { client: ApiClient }) {
  const thisMonth = monthKeyOf(new Date());
  const [month, setMonth] = useState(thisMonth);
  const summary = useLoad(`summary:${month}`, () => client.get<Summary>('summary', { month }));

  return (
    <>
      <nav className="month-nav" aria-label="Month">
        <button className="icon-button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
          ‹
        </button>
        <h1>{formatMonthLabel(month)}</h1>
        <button
          className="icon-button"
          aria-label="Next month"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </nav>

      {summary.state === 'loading' && (
        <div className="card" aria-busy="true">
          <div className="skeleton" style={{ width: '30%' }} />
          <div className="skeleton" style={{ width: '60%', height: 32 }} />
        </div>
      )}
      {summary.state === 'error' && <div className="card error">{summary.message}</div>}
      {summary.state === 'ready' && <SummaryView summary={summary.data} />}
    </>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  const change = summary.spentSgd - summary.previousMonthSpentSgd;
  const previousLabel = formatMonthLabel(shiftMonth(summary.month, -1)).split(' ')[0];

  return (
    <>
      <section className="card" aria-label="Spent">
        <h2>Spent</h2>
        <div className="hero-value num">{formatMoney(summary.spentSgd)}</div>
        <div className="muted small">
          {summary.count} {summary.count === 1 ? 'expense' : 'expenses'}
          {summary.previousMonthSpentSgd > 0 && (
            <>
              {' · '}
              {formatMoney(Math.abs(change))} {change >= 0 ? 'more' : 'less'} than {previousLabel}
            </>
          )}
        </div>
      </section>

      <div className="stats">
        <section className="card" aria-label="Income">
          <h2>Income</h2>
          <div className="stat-value num">{formatMoney(summary.incomeSgd)}</div>
        </section>
        <section className="card" aria-label="Saved">
          <h2>Saved</h2>
          {summary.savingsRate === null ? (
            <div className="stat-value muted">—</div>
          ) : (
            <>
              <div className="stat-value num" style={summary.savingsRate < 0 ? { color: 'var(--danger)' } : undefined}>
                {formatPercent(summary.savingsRate)}
              </div>
              <div className="muted small num">
                {summary.savingsRate < 0
                  ? `${formatMoney(summary.spentSgd - summary.incomeSgd)} over income`
                  : formatMoney(summary.incomeSgd - summary.spentSgd)}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="category-heading">
        <h2 id="category-heading">By category</h2>
        {summary.byCategory.length === 0 ? (
          <p className="muted small">Nothing logged this month. Tell the bot what you spend and it shows up here.</p>
        ) : (
          <CategoryChart rows={summary.byCategory} total={summary.spentSgd} />
        )}
      </section>
    </>
  );
}
