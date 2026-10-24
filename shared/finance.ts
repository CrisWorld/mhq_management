import type { Balance, FinancialOrder, Order } from './types';
export function todayVN(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
export function nextMonth(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`;
}
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}
/** Simple monthly interest. Purchase month is free. Interest never bears interest.
 * Accrual is at the start of each calendar month in Vietnam. Payments settle interest first.
 * All amounts are integer VND; round each monthly accrual to the nearest VND. */
export function balanceAt(order: FinancialOrder, asOf = todayVN()): Balance {
  const result: Balance = { principal: 0, interest: 0, total: 0, paid: 0, accrued: 0, ledger: [] };
  if (order.deleted_at || order.ordered_on > asOf) return result;
  result.principal = Number(order.total);
  const events = [...order.payments]
    .filter((p) => !p.deleted_at && p.paid_on <= asOf)
    .sort(
      (a, b) =>
        a.paid_on.localeCompare(b.paid_on) ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id),
    );
  let accrualDate = nextMonth(order.ordered_on);
  const accrueUntil = (date: string) => {
    while (accrualDate <= date) {
      const amount = order.apply_interest
        ? Number(
            (BigInt(result.principal) * BigInt(order.interest_per_million) + 500_000n) / 1_000_000n,
          )
        : 0;
      result.interest += amount;
      result.accrued += amount;
      if (amount > 0)
        result.ledger.push({
          date: accrualDate,
          type: 'interest',
          amount,
          principal: result.principal,
          interest: result.interest,
          label: 'Lãi tháng ' + accrualDate.slice(5, 7) + '/' + accrualDate.slice(0, 4),
        });
      accrualDate = nextMonth(accrualDate);
    }
  };
  for (const p of events) {
    accrueUntil(p.paid_on);
    const interestPaid = Math.min(result.interest, Number(p.amount));
    result.interest -= interestPaid;
    result.principal = Math.max(0, result.principal - (Number(p.amount) - interestPaid));
    result.paid += Number(p.amount);
    result.ledger.push({
      date: p.paid_on,
      type: 'payment',
      payment_id: p.id,
      amount: Number(p.amount),
      principal: result.principal,
      interest: result.interest,
      label: p.kind === 'down_payment' ? 'Trả trước' : p.note || 'Thu trả góp',
    });
  }
  accrueUntil(asOf);
  result.total = result.principal + result.interest;
  return result;
}
export function customerDebt(orders: Order[], customerId: string, asOf = todayVN()) {
  return orders
    .filter((o) => !o.deleted_at && o.customer_id === customerId)
    .reduce(
      (sum, o) => {
        const b = balanceAt(o, asOf);
        return {
          principal: sum.principal + b.principal,
          interest: sum.interest + b.interest,
          total: sum.total + b.total,
        };
      },
      { principal: 0, interest: 0, total: 0 },
    );
}
export function monthlyReport(orders: Order[], month: string, now = todayVN()) {
  const asOf = monthEnd(month) < now ? monthEnd(month) : now;
  const visible = orders.filter((o) => !o.deleted_at && o.ordered_on <= asOf);
  // A customer is pending when at least one older, outstanding order has no installment this month.
  const pendingIds = [
    ...new Set(
      visible
        .filter(
          (o) =>
            o.ordered_on.slice(0, 7) < month &&
            balanceAt(o, asOf).total > 0 &&
            !o.payments.some(
              (p) =>
                !p.deleted_at &&
                p.kind === 'installment' &&
                p.paid_on.startsWith(month) &&
                p.paid_on <= asOf,
            ),
        )
        .map((o) => o.customer_id),
    ),
  ];
  const totals = visible.reduce(
    (s, o) => {
      const b = balanceAt(o, asOf);
      return { principal: s.principal + b.principal, interest: s.interest + b.interest };
    },
    { principal: 0, interest: 0 },
  );
  return {
    asOf,
    pendingIds,
    ...totals,
    total: totals.principal + totals.interest,
    revenue: visible
      .filter((o) => o.ordered_on.startsWith(month))
      .reduce((s, o) => s + Number(o.total), 0),
    collected: visible
      .flatMap((o) => o.payments)
      .filter((p) => !p.deleted_at && p.paid_on.startsWith(month) && p.paid_on <= asOf)
      .reduce((s, p) => s + Number(p.amount), 0),
    orderCount: visible.filter((o) => o.ordered_on.startsWith(month)).length,
  };
}
