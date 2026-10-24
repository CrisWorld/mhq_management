import type { RecordType } from '../../../shared/types.js';
import type { AuthContext } from '../../modules/auth/auth-request.type.js';
import { queryData } from './query.js';

export async function setDeleted(
  { db }: AuthContext,
  type: RecordType,
  id: string,
  deleted = true,
) {
  return {
    id: queryData(
      await db.rpc('set_record_deleted', { p_type: type, p_id: id, p_deleted: deleted }),
    ),
  };
}
