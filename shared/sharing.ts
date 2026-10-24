import type { Balance, Item, LedgerEntry, Order } from './types';

export interface CustomerShareLink {
  token: string;
  created_at: string;
}
export type StatementLedgerEntry = Omit<LedgerEntry, 'payment_id'>;
export interface StatementOrder extends Pick<
  Order,
  'code' | 'ordered_on' | 'total' | 'apply_interest' | 'interest_per_million'
> {
  items: Pick<Item, 'name' | 'quantity' | 'price'>[];
  balance: Omit<Balance, 'ledger'> & { ledger: StatementLedgerEntry[] };
}
export interface CustomerStatement {
  store_name: string;
  customer_name: string;
  as_of: string;
  generated_at: string;
  balance: { principal: number; interest: number; total: number; paid: number };
  orders: StatementOrder[];
}
export function isShareToken(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
export function customerShareUrl(origin: string, token: string) {
  const url = new URL('/share', origin);
  // Fragments stay out of page request URLs, server access logs and referrers.
  url.hash = token;
  return url.href;
}
