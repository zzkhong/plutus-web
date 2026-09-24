/** Response shapes of plutus-ai's /api/web routes (src/webhook/routes/web.ts there). */

import type { Currency } from './format';

export const CATEGORIES = [
  'Food',
  'Transport',
  'Groceries',
  'Entertainment',
  'Bills',
  'Health',
  'Education',
  'Travel',
  'Shopping',
  'Others',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface SessionUser {
  id: string;
  isAdmin: boolean;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: SessionUser;
}

export interface Summary {
  month: string;
  from: string;
  to: string;
  spentSgd: number;
  count: number;
  previousMonthSpentSgd: number;
  incomeSgd: number;
  savingsRate: number | null;
  byCategory: Array<{ category: Category; spentSgd: number; count: number }>;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: Currency;
  amountSgd: number;
  merchant: string;
  category: Category;
  source: string;
  note: string | null;
  spentAt: string;
  createdAt: string;
}

export interface TransactionPage {
  transactions: Transaction[];
  nextCursor: string | null;
}

export interface AdminUser {
  id: string;
  telegramChatId: string;
  status: 'onboarding' | 'pending_approval' | 'approved';
  isAdmin: boolean;
  createdAt: string;
}
