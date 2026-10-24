import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { PaymentDto } from './dto/payment.dto.js';
import type { PaymentUpdateDto } from './dto/payment-update.dto.js';
import { setDeleted } from '../../common/database/soft-delete.js';
@Injectable()
export class PaymentsService {
  async create({ db }: AuthContext, orderId: string, dto: PaymentDto) {
    return {
      id: queryData(
        await db.rpc('record_payment', {
          p_id: dto.id,
          p_order_id: orderId,
          p_amount: dto.amount,
          p_paid_on: dto.paid_on,
          p_note: dto.note,
        }),
      ),
    };
  }
  async update({ db }: AuthContext, orderId: string, id: string, dto: PaymentUpdateDto) {
    return {
      id: queryData(
        await db.rpc('update_payment', {
          p_id: id,
          p_order_id: orderId,
          p_version: dto.version,
          p_amount: dto.amount,
          p_paid_on: dto.paid_on,
          p_note: dto.note,
        }),
      ),
    };
  }
  async remove(context: AuthContext, orderId: string, id: string) {
    queryData(
      await context.db.from('payments').select('id').eq('id', id).eq('order_id', orderId).single(),
    );
    return setDeleted(context, 'payment', id);
  }
}
