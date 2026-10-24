import { Injectable } from '@nestjs/common';
import { queryData } from '../../common/database/query.js';
import type { AuthContext } from '../auth/auth-request.type.js';
import type { SettingsDto } from './dto/settings.dto.js';
@Injectable()
export class SettingsService {
  update({ db, uid }: AuthContext, dto: SettingsDto) {
    return db
      .from('stores')
      .update({ ...dto, name: dto.name.trim() })
      .eq('owner_id', uid)
      .select()
      .single()
      .then(queryData);
  }
}
