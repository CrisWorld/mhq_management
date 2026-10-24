import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  Customer,
  Note,
  Order,
  Payment,
  Product,
  RecordType,
  TrashRecord,
} from '../../../shared/types.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import { listAll } from '../../common/database/query.js';
import { setDeleted } from '../../common/database/soft-delete.js';

@Injectable()
export class TrashService {
  async list({ db }: AuthContext): Promise<TrashRecord[]> {
    // Include parents in lookup maps so the trash can explain restore dependencies.
    const [customers, products, notes, orders, payments] = await Promise.all([
      listAll<Customer>(db, 'customers', 'all'),
      listAll<Product>(db, 'products', 'deleted'),
      listAll<Note>(db, 'customer_notes', 'deleted'),
      listAll<Order>(db, 'orders', 'all'),
      listAll<Payment>(db, 'payments', 'deleted'),
    ]);
    const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    const result: TrashRecord[] = [];
    const add = (
      row: { id: string; deleted_at?: string | null },
      type: RecordType,
      label: string,
      detail: string,
      parentDeleted = false,
    ) => {
      if (row.deleted_at)
        result.push({
          id: row.id,
          type,
          label,
          detail,
          deleted_at: row.deleted_at,
          parent_deleted: parentDeleted,
        });
    };
    customers.forEach((customer) => add(customer, 'customer', customer.name, customer.phone));
    products.forEach((product) => add(product, 'product', product.name, `${product.price} ₫`));
    notes.forEach((note) =>
      add(
        note,
        'note',
        note.content,
        customerMap.get(note.customer_id)?.name || '',
        !!customerMap.get(note.customer_id)?.deleted_at,
      ),
    );
    orders.forEach((order) =>
      add(
        order,
        'order',
        order.code,
        customerMap.get(order.customer_id)?.name || '',
        !!customerMap.get(order.customer_id)?.deleted_at,
      ),
    );
    payments.forEach((payment) => {
      const order = orderMap.get(payment.order_id);
      add(
        payment,
        'payment',
        `${payment.amount} ₫ · ${payment.paid_on}`,
        `${order?.code || ''} · ${customerMap.get(order?.customer_id || '')?.name || ''}`,
        !!order?.deleted_at || !!customerMap.get(order?.customer_id || '')?.deleted_at,
      );
    });
    return result.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
  }
  restore(context: AuthContext, type: string, id: string) {
    if (!['customer', 'product', 'note', 'order', 'payment'].includes(type))
      throw new BadRequestException('Loại dữ liệu không hợp lệ');
    return setDeleted(context, type as RecordType, id, false);
  }
}
