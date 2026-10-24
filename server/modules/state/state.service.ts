import { Injectable } from '@nestjs/common';
import type {
  Customer,
  Item,
  Note,
  Order,
  Payment,
  Product,
  State,
  Store,
} from '../../../shared/types.js';
import { ensureSuccess, listAll, queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
type OrderRecord = Omit<Order, 'items' | 'payments'>;
type ItemRecord = Item & { order_id: string };
function groupByOrder<T extends { order_id: string }>(rows: T[]) {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const group = result.get(row.order_id) || [];
    group.push(row);
    result.set(row.order_id, group);
  }
  return result;
}
@Injectable()
export class StateService {
  async get({ db, uid }: AuthContext): Promise<State> {
    ensureSuccess(
      await db
        .from('stores')
        .upsert({ owner_id: uid }, { onConflict: 'owner_id', ignoreDuplicates: true }),
    );
    const [store, customers, products, notes, orders, items, payments] = await Promise.all([
      db
        .from('stores')
        .select('*')
        .single()
        .then(queryData<Store>),
      listAll<Customer>(db, 'customers'),
      listAll<Product>(db, 'products'),
      listAll<Note>(db, 'customer_notes'),
      listAll<OrderRecord>(db, 'orders'),
      listAll<ItemRecord>(db, 'order_items'),
      listAll<Payment>(db, 'payments'),
    ]);
    const itemsByOrder = groupByOrder(items);
    const paymentsByOrder = groupByOrder(payments);
    return {
      store,
      customers,
      products,
      notes,
      orders: orders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
        payments: paymentsByOrder.get(order.id) || [],
      })),
    };
  }
}
