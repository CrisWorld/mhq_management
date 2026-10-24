import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { CustomerDto } from './dto/customer.dto.js';
import type { NoteDto } from './dto/note.dto.js';
@Injectable()
export class CustomersService {
  create({ db, uid }: AuthContext, dto: CustomerDto) {
    return db
      .from('customers')
      .insert({ ...dto, name: dto.name.trim(), owner_id: uid })
      .select()
      .single()
      .then(queryData);
  }
  update({ db }: AuthContext, id: string, dto: CustomerDto) {
    return db
      .from('customers')
      .update({ ...dto, name: dto.name.trim() })
      .eq('id', id)
      .select()
      .single()
      .then(queryData);
  }
  addNote({ db, uid }: AuthContext, id: string, dto: NoteDto) {
    return db
      .from('customer_notes')
      .insert({ content: dto.content.trim(), customer_id: id, owner_id: uid })
      .select()
      .single()
      .then(queryData);
  }
}
