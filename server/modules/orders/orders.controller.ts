import { Controller, Delete, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { OrdersService } from './orders.service.js';
import { OrderDto } from './dto/order.dto.js';
import { OrderUpdateDto } from './dto/order-update.dto.js';
@Controller('api/orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}
  @Post() create(@Req() request: AuthRequest, @ValidatedBody(OrderDto) dto: OrderDto) {
    return this.orders.create(request, dto);
  }
  @Patch(':id') update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @ValidatedBody(OrderUpdateDto) dto: OrderUpdateDto,
  ) {
    return this.orders.update(request, id, dto);
  }
  @Delete(':id') remove(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.remove(request, id);
  }
}
