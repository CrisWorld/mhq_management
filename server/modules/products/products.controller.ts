import { Controller, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { ProductsService } from './products.service.js';
import { ProductDto } from './dto/product.dto.js';
@Controller('api/products')
@UseGuards(AuthGuard)
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}
  @Post() create(@Req() request: AuthRequest, @ValidatedBody(ProductDto) dto: ProductDto) {
    return this.products.create(request, dto);
  }
  @Patch(':id') update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @ValidatedBody(ProductDto) dto: ProductDto,
  ) {
    return this.products.update(request, id, dto);
  }
}
