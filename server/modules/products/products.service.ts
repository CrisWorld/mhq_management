import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { ProductDto } from './dto/product.dto.js';
@Injectable()
export class ProductsService {
  create({ db, uid }: AuthContext, dto: ProductDto) {
    return db
      .from('products')
      .insert({ ...dto, name: dto.name.trim(), owner_id: uid })
      .select()
      .single()
      .then(queryData);
  }
  update({ db }: AuthContext, id: string, dto: ProductDto) {
    return db
      .from('products')
      .update({ ...dto, name: dto.name.trim() })
      .eq('id', id)
      .select()
      .single()
      .then(queryData);
  }
}
