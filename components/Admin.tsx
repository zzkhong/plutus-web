'use client';

import type { ApiClient } from '@/lib/api';
import type { AdminUser } from '@/lib/types';
import { formatDay } from '@/lib/format';
import { useLoad } from '@/lib/use-api';

const STATUS_LABELS: Record<AdminUser['status'], string> = {
  pending_approval: 'Waiting for approval',
  onboarding: 'Setting up',
  approved: 'Approved',
};

// Waiting-for-approval first: that's what an admin comes here to act on.
const STATUS_ORDER: AdminUser['status'][] = ['pending_approval', 'onboarding', 'approved'];

/** Read-only. Approving and rejecting stay bot commands (/approve, /reject). */
export function Admin({ client }: { client: ApiClient }) {
  const users = useLoad('admin-users', () => client.get<{ users: AdminUser[] }>('admin/users'));

  if (users.state === 'loading') {
    return <div className="card skeleton" style={{ height: 120 }} aria-busy="true" />;
  }
  if (users.state === 'error') {
    return <div className="card error">{users.message}</div>;
  }

  const list = users.data.users;
  const pending = list.filter((user) => user.status === 'pending_approval').length;

  return (
    <>
      <div className="stats">
        <section className="card" aria-label="Users">
          <h2>Users</h2>
          <div className="stat-value num">{list.length}</div>
        </section>
        <section className="card" aria-label="Waiting for approval">
          <h2>Waiting</h2>
          <div className="stat-value num">{pending}</div>
        </section>
      </div>
      {pending > 0 && (
        <p className="muted small">
          Approve someone in the bot with <b>/approve &lt;chat id&gt;</b>.
        </p>
      )}
      {STATUS_ORDER.map((status) => {
        const group = list.filter((user) => user.status === status);
        if (group.length === 0) {
          return null;
        }
        return (
          <section key={status} className="day-group">
            <h3>
              {STATUS_LABELS[status]} ({group.length})
            </h3>
            <ul className="rows">
              {group.map((user) => (
                <li key={user.id} className="row">
                  <div className="row-main">
                    <div className="row-title num">Chat {user.telegramChatId}</div>
                    <div className="muted small">Joined {formatDay(user.createdAt)}</div>
                  </div>
                  {user.isAdmin && <span className="badge">Admin</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
