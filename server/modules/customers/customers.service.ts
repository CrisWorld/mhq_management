import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { CustomerDto } from './dto/customer.dto.js';
import type { NoteDto } from './dto/note.dto.js';
import { setDeleted } from '../../common/database/soft-delete.js';
@Injectable()
export class CustomersService {
  create(context: AuthContext, dto: CustomerDto) {
    return this.save(context, dto);
  }
  update(context: AuthContext, id: string, dto: CustomerDto) {
    return this.save(context, dto, id);
  }
  private save({ db }: AuthContext, dto: CustomerDto, id?: string) {
    return db
      .rpc('save_customer', {
        p_id: id ?? null,
        p_name: dto.name.trim(),
        p_phone: dto.phone,
        p_address: dto.address,
        p_apply_interest: dto.apply_interest,
      })
      .then(queryData);
  }
  addNote(context: AuthContext, customerId: string, dto: NoteDto) {
    return this.saveNote(context, customerId, dto);
  }
  updateNote(context: AuthContext, customerId: string, id: string, dto: NoteDto) {
    return this.saveNote(context, customerId, dto, id);
  }
  private saveNote({ db }: AuthContext, customerId: string, dto: NoteDto, id?: string) {
    return db
      .rpc('save_note', {
        p_id: id ?? null,
        p_customer_id: customerId,
        p_content: dto.content.trim(),
      })
      .then(queryData);
  }
  remove(context: AuthContext, id: string) {
    return setDeleted(context, 'customer', id);
  }
  async removeNote(context: AuthContext, customerId: string, id: string) {
    queryData(
      await context.db
        .from('customer_notes')
        .select('id')
        .eq('id', id)
        .eq('customer_id', customerId)
        .single(),
    );
    return setDeleted(context, 'note', id);
  }
}
