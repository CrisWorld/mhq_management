import { FileText, Pencil } from 'lucide-react';
import type { Customer, Note } from '../../../../shared/types';
import { useUi } from '../../../app/providers/UiProvider';
import { dateText } from '../../../lib/format';
import { DeleteButton } from '../../../shared/ui/DeleteButton';

export function NoteCard({ note, customer }: { note: Note; customer: Customer }) {
  const { open } = useUi();
  return (
    <article className="note-card">
      <div>
        <FileText size={16} />
        <time>
          {dateText(note.created_at)} ·{' '}
          {new Intl.DateTimeFormat('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh',
          }).format(new Date(note.created_at))}
        </time>
      </div>
      <p>{note.content}</p>
      <div className="record-actions compact-actions">
        <button className="text-button" onClick={() => open({ type: 'note', customer, note })}>
          <Pencil size={15} />
          Sửa ghi chú
        </button>
        <DeleteButton
          path={'customers/' + customer.id + '/notes/' + note.id}
          label="Xoá ghi chú"
          detail="Ghi chú này sẽ được ẩn khỏi hồ sơ khách hàng."
        />
      </div>
    </article>
  );
}
