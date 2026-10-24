import type { FinancialOrder } from '../../../shared/types.js';
import { balanceAt, todayVN } from '../../../shared/finance.js';
import type { CustomerStatement, StatementOrder } from '../../../shared/sharing.js';

export interface StatementSource {
  store_name: string;
  customer_name: string;
  orders: (FinancialOrder & Pick<StatementOrder, 'code' | 'items'>)[];
}
export function buildStatement(source: StatementSource, now = new Date()): CustomerStatement {
  const asOf = todayVN(now);
  const orders = source.orders
    .filter((order) => !order.deleted_at && order.ordered_on <= asOf)
    .map((order) => {
      // Sanitize notes again before the ledger engine: future source changes must
      // not turn an internal payment memo into a customer-visible label.
      const balance = balanceAt(
        { ...order, payments: order.payments.map((payment) => ({ ...payment, note: '' })) },
        asOf,
      );
      return {
        code: order.code,
        ordered_on: order.ordered_on,
        total: Number(order.total),
        apply_interest: order.apply_interest,
        interest_per_million: order.interest_per_million,
        items: order.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: Number(item.price),
        })),
        balance: {
          ...balance,
          ledger: balance.ledger.map((entry) => ({
            date: entry.date,
            type: entry.type,
            label: entry.label,
            amount: entry.amount,
            principal: entry.principal,
            interest: entry.interest,
          })),
        },
      };
    });
  return {
    store_name: source.store_name,
    customer_name: source.customer_name,
    as_of: asOf,
    generated_at: now.toISOString(),
    orders,
    balance: orders.reduce(
      (sum, order) => ({
        principal: sum.principal + order.balance.principal,
        interest: sum.interest + order.balance.interest,
        total: sum.total + order.balance.total,
        paid: sum.paid + order.balance.paid,
      }),
      { principal: 0, interest: 0, total: 0, paid: 0 },
    ),
  };
}
