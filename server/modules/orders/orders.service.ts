import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { OrderDto } from './dto/order.dto.js';
import type { OrderUpdateDto } from './dto/order-update.dto.js';
import { setDeleted } from '../../common/database/soft-delete.js';
@Injectable()
export class OrdersService {
  async create({ db }: AuthContext, dto: OrderDto) {
    return {
      id: queryData(
        await db.rpc('create_order', {
          p_id: dto.id,
          p_customer_id: dto.customer_id,
          p_ordered_on: dto.ordered_on,
          p_apply_interest: dto.apply_interest,
          p_items: dto.items,
          p_down_payment: dto.down_payment,
          p_note: dto.note,
        }),
      ),
    };
  }
  async update({ db }: AuthContext, id: string, dto: OrderUpdateDto) {
    return {
      id: queryData(
        await db.rpc('update_order', {
          p_id: id,
          p_version: dto.version,
          p_ordered_on: dto.ordered_on,
          p_apply_interest: dto.apply_interest,
          p_items: dto.items,
          p_note: dto.note,
        }),
      ),
    };
  }
  remove(context: AuthContext, id: string) {
    return setDeleted(context, 'order', id);
  }
}
