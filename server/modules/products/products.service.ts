import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { ProductDto } from './dto/product.dto.js';
import { setDeleted } from '../../common/database/soft-delete.js';
@Injectable()
export class ProductsService {
  create(context: AuthContext, dto: ProductDto) {
    return this.save(context, dto);
  }
  update(context: AuthContext, id: string, dto: ProductDto) {
    return this.save(context, dto, id);
  }
  private save({ db }: AuthContext, dto: ProductDto, id?: string) {
    return db
      .rpc('save_product', { p_id: id ?? null, p_name: dto.name.trim(), p_price: dto.price })
      .then(queryData);
  }
  remove(context: AuthContext, id: string) {
    return setDeleted(context, 'product', id);
  }
}
