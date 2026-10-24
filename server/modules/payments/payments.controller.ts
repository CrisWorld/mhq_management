import { Controller, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { PaymentsService } from './payments.service.js';
import { PaymentDto } from './dto/payment.dto.js';
@Controller('api/orders/:id/payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}
  @Post() create(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @ValidatedBody(PaymentDto) dto: PaymentDto,
  ) {
    return this.payments.create(request, id, dto);
  }
}
