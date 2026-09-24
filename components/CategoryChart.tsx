'use client';

import { formatMoney, formatPercent } from '@/lib/format';
import type { Summary } from '@/lib/types';

/**
 * The month's spending by category: one series, so one color and no legend.
 * Bars are sorted largest first, grow from a shared baseline, and carry their
 * value at the tip, so nothing depends on hover. Hover or focus adds the
 * share and the number of expenses.
 */
export function CategoryChart({ rows, total }: { rows: Summary['byCategory']; total: number }) {
  const max = Math.max(...rows.map((row) => row.spentSgd), 1);

  return (
    <ul className="bars">
      {rows.map((row) => {
        const share = total > 0 ? row.spentSgd / total : 0;
        const detail = `${row.category}: ${formatMoney(row.spentSgd)}, ${formatPercent(share)} of spending, ${row.count} ${
          row.count === 1 ? 'expense' : 'expenses'
        }`;
        return (
          <li key={row.category} className="bar-row" tabIndex={0} title={detail} aria-label={detail}>
            <span className="bar-label">{row.category}</span>
            <span className="bar-track">
              {/* Leave room for the value label at the tip. */}
              <span className="bar" style={{ width: `calc((100% - 88px) * ${row.spentSgd / max})` }} />
              <span className="bar-value num">{formatMoney(row.spentSgd)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
