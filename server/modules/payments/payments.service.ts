import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { PaymentDto } from './dto/payment.dto.js';
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
}
