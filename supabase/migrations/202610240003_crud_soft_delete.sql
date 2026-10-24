-- Reversible deletion for every business record; financial changes are atomic and replayed.
do $$
declare t text;
begin
 for t in select unnest(array['customers','products','customer_notes','orders','order_items','payments']) loop
  execute format('alter table public.%I add column deleted_at timestamptz, add column updated_at timestamptz not null default now()',t);
  execute format('create index %I on public.%I(owner_id,deleted_at)',t||'_deleted_idx',t);
 end loop;
end $$;
alter table public.orders add column version integer not null default 1;
alter table public.payments add column version integer not null default 1;

create function public.mhq_touch_record() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 new.updated_at:=clock_timestamp();
 if tg_table_name in ('orders','payments') then new.version:=old.version+1; end if;
 return new;
end $$;
do $$
declare t text;
begin
 for t in select unnest(array['customers','products','customer_notes','orders','order_items','payments']) loop
  execute format('create trigger touch_record before update on public.%I for each row execute function public.mhq_touch_record()',t);
 end loop;
end $$;

-- All writes use owner-checked functions; authenticated clients cannot hard-delete or
-- bypass history validation with a direct table update. A per-store transaction lock
-- serializes creation, edits, deletion and restoration (including parent records).
revoke insert,update,delete on public.customers,public.products,public.customer_notes,public.orders,public.order_items,public.payments from authenticated;
create function public.mhq_lock_store() returns uuid language plpgsql set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Vui lòng đăng nhập'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,92301));
 return uid;
end $$;

create function public.save_customer(p_name text,p_phone text,p_address text,p_apply_interest boolean,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); r public.customers%rowtype;
begin
 if p_id is null then
  insert into public.customers(owner_id,name,phone,address,apply_interest) values(uid,trim(p_name),p_phone,p_address,p_apply_interest) returning * into r;
 else
  update public.customers set name=trim(p_name),phone=p_phone,address=p_address,apply_interest=p_apply_interest where id=p_id and owner_id=uid and deleted_at is null returning * into r;
  if not found then raise exception 'Khách hàng không tồn tại hoặc đã xoá'; end if;
 end if;
 return to_jsonb(r);
end $$;
create function public.save_product(p_name text,p_price bigint,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); r public.products%rowtype;
begin
 if p_id is null then
  insert into public.products(owner_id,name,price) values(uid,trim(p_name),p_price) returning * into r;
 else
  update public.products set name=trim(p_name),price=p_price where id=p_id and owner_id=uid and deleted_at is null returning * into r;
  if not found then raise exception 'Sản phẩm không tồn tại hoặc đã xoá'; end if;
 end if;
 return to_jsonb(r);
end $$;
create function public.save_note(p_customer_id uuid,p_content text,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); r public.customer_notes%rowtype;
begin
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=uid and deleted_at is null) then raise exception 'Khách hàng không tồn tại hoặc đã xoá'; end if;
 if p_id is null then
  insert into public.customer_notes(owner_id,customer_id,content) values(uid,p_customer_id,trim(p_content)) returning * into r;
 else
  update public.customer_notes set content=trim(p_content) where id=p_id and customer_id=p_customer_id and owner_id=uid and deleted_at is null returning * into r;
  if not found then raise exception 'Ghi chú không tồn tại hoặc đã xoá'; end if;
 end if;
 return to_jsonb(r);
end $$;

create or replace function public.order_balance(p_order_id uuid,p_as_of date) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare o public.orders%rowtype; p record; principal bigint; interest bigint:=0; next_month date; charge bigint;
begin
 select * into o from public.orders where id=p_order_id and deleted_at is null and exists(select 1 from public.customers c where c.id=customer_id and c.deleted_at is null);
 if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
 if p_as_of<o.ordered_on then return jsonb_build_object('principal',0,'interest',0,'total',0); end if;
 principal:=o.total; next_month:=(date_trunc('month',o.ordered_on)+interval '1 month')::date;
 for p in select * from public.payments where order_id=o.id and deleted_at is null and paid_on<=p_as_of order by paid_on,created_at,id loop
  while next_month<=p.paid_on loop
   if o.apply_interest then interest:=interest+round(principal::numeric*o.interest_per_million/1000000)::bigint; end if;
   next_month:=(next_month+interval '1 month')::date;
  end loop;
  charge:=least(interest,p.amount); interest:=interest-charge; principal:=greatest(0,principal-(p.amount-charge));
 end loop;
 while next_month<=p_as_of loop
  if o.apply_interest then interest:=interest+round(principal::numeric*o.interest_per_million/1000000)::bigint; end if;
  next_month:=(next_month+interval '1 month')::date;
 end loop;
 return jsonb_build_object('principal',principal,'interest',interest,'total',principal+interest);
end $$;

-- Replay every payment after an edit/restore: a change to the past must not silently
-- clamp an overpayment to zero or produce a negative debt at a later payment.
create function public.mhq_assert_order_payments(p_order_id uuid) returns void
language plpgsql set search_path=public,pg_temp as $$
declare o public.orders%rowtype; p record; principal bigint; interest bigint:=0; next_month date; charge bigint;
begin
 select * into strict o from public.orders where id=p_order_id;
 principal:=o.total; next_month:=(date_trunc('month',o.ordered_on)+interval '1 month')::date;
 for p in select * from public.payments where order_id=o.id and deleted_at is null order by paid_on,created_at,id loop
  if p.paid_on<o.ordered_on or p.paid_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date or (p.kind='down_payment' and p.paid_on<>o.ordered_on) then
   raise exception 'Ngày khoản thu không hợp lệ với ngày mua hàng';
  end if;
  while next_month<=p.paid_on loop
   if o.apply_interest then interest:=interest+round(principal::numeric*o.interest_per_million/1000000)::bigint; end if;
   next_month:=(next_month+interval '1 month')::date;
  end loop;
  if p.amount>principal+interest then raise exception 'Thay đổi làm khoản thu ngày % vượt số nợ. Hãy sửa hoặc xoá khoản thu đó trước.',to_char(p.paid_on,'DD/MM/YYYY'); end if;
  charge:=least(interest,p.amount); interest:=interest-charge; principal:=principal-(p.amount-charge);
 end loop;
end $$;

create or replace function public.create_order(p_id uuid,p_customer_id uuid,p_ordered_on date,p_apply_interest boolean,p_items jsonb,p_down_payment bigint default 0,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); rate integer; entry jsonb; prod public.products%rowtype; total_amount bigint:=0; qty integer;
begin
 if exists(select 1 from public.orders where id=p_id and owner_id=uid) then
  if not exists(select 1 from public.orders o where o.id=p_id and o.deleted_at is null and o.customer_id=p_customer_id and o.ordered_on=p_ordered_on and o.apply_interest=p_apply_interest and o.note=p_note)
   or p_down_payment<>coalesce((select sum(amount) from public.payments where order_id=p_id and kind='down_payment' and deleted_at is null),0)
   or (select jsonb_agg(jsonb_build_object('product_id',product_id,'quantity',quantity) order by product_id,quantity) from public.order_items where order_id=p_id and deleted_at is null)
      is distinct from (select jsonb_agg(value order by (value->>'product_id')::uuid,(value->>'quantity')::int) from jsonb_array_elements(p_items))
   then raise exception 'Yêu cầu đã lưu với thông tin khác hoặc đã xoá. Hãy đóng và mở lại biểu mẫu.'; end if;
  return p_id;
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=uid and deleted_at is null) then raise exception 'Khách hàng không tồn tại hoặc đã xoá'; end if;
 if p_ordered_on is null or p_ordered_on<'2000-01-01' or p_ordered_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày mua không hợp lệ'; end if;
 if p_apply_interest is null or p_down_payment is null or p_note is null then raise exception 'Thiếu thông tin đơn hàng'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Danh sách sản phẩm không hợp lệ'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Đơn cần có từ 1 đến 100 sản phẩm'; end if;
 select interest_per_million into rate from public.stores where owner_id=uid;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into prod from public.products where id=(entry->>'product_id')::uuid and owner_id=uid and deleted_at is null;
  if not found then raise exception 'Sản phẩm không tồn tại hoặc đã xoá'; end if;
  if (entry->>'quantity') is null or (entry->>'quantity')!~'^[0-9]+$' then raise exception 'Số lượng không hợp lệ'; end if;
  qty:=(entry->>'quantity')::integer;
  if qty<1 or qty>10000 then raise exception 'Số lượng không hợp lệ'; end if;
  total_amount:=total_amount+prod.price*qty;
 end loop;
 if total_amount<=0 or total_amount>1000000000000 or p_down_payment<0 or p_down_payment>total_amount then raise exception 'Tổng đơn hoặc tiền trả trước không hợp lệ'; end if;
 insert into public.orders(id,owner_id,customer_id,ordered_on,total,apply_interest,interest_per_million,note) values(p_id,uid,p_customer_id,p_ordered_on,total_amount,p_apply_interest,rate,p_note);
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into prod from public.products where id=(entry->>'product_id')::uuid and owner_id=uid and deleted_at is null;
  insert into public.order_items(owner_id,order_id,product_id,name,quantity,price) values(uid,p_id,prod.id,prod.name,(entry->>'quantity')::integer,prod.price);
 end loop;
 if p_down_payment>0 then insert into public.payments(id,owner_id,order_id,amount,paid_on,kind,note) values(gen_random_uuid(),uid,p_id,p_down_payment,p_ordered_on,'down_payment','Trả trước khi mua'); end if;
 return p_id;
end $$;

create function public.update_order(p_id uuid,p_version integer,p_ordered_on date,p_apply_interest boolean,p_items jsonb,p_note text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); o public.orders%rowtype; entry jsonb; prod public.products%rowtype; snapshot_name text; qty integer; price_amount bigint; total_amount bigint:=0; new_items jsonb:='[]';
begin
 select * into o from public.orders where id=p_id and owner_id=uid and deleted_at is null;
 if not found or not exists(select 1 from public.customers where id=o.customer_id and owner_id=uid and deleted_at is null) then raise exception 'Đơn hàng hoặc khách hàng đã xoá'; end if;
 if p_version is distinct from o.version then raise exception 'Đơn hàng đã thay đổi. Hãy làm mới dữ liệu rồi mở lại biểu mẫu.'; end if;
 if p_ordered_on is null or p_ordered_on<'2000-01-01' or p_ordered_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày mua không hợp lệ'; end if;
 if p_apply_interest is null or p_note is null then raise exception 'Thiếu thông tin đơn hàng'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Danh sách sản phẩm không hợp lệ'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>100 then raise exception 'Đơn cần có từ 1 đến 100 sản phẩm'; end if;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into prod from public.products where id=(entry->>'product_id')::uuid and owner_id=uid;
  if not found then raise exception 'Sản phẩm không tồn tại'; end if;
  select name into snapshot_name from public.order_items where order_id=o.id and product_id=prod.id and deleted_at is null order by id limit 1;
  if snapshot_name is null and prod.deleted_at is not null then raise exception 'Không thể thêm sản phẩm đã xoá vào đơn'; end if;
  if coalesce(entry->>'quantity','')!~'^[0-9]+$' or coalesce(entry->>'price','')!~'^[0-9]+$' then raise exception 'Số lượng hoặc đơn giá không hợp lệ'; end if;
  qty:=(entry->>'quantity')::integer; price_amount:=(entry->>'price')::bigint;
  if qty<1 or qty>10000 or price_amount<0 or price_amount>100000000000 then raise exception 'Số lượng hoặc đơn giá không hợp lệ'; end if;
  total_amount:=total_amount+price_amount*qty;
  new_items:=new_items||jsonb_build_array(jsonb_build_object('product_id',prod.id,'name',coalesce(snapshot_name,prod.name),'quantity',qty,'price',price_amount));
 end loop;
 if total_amount<=0 or total_amount>1000000000000 then raise exception 'Tổng giá trị đơn không hợp lệ'; end if;
 -- Preserve the original interest-rate snapshot even when store settings have changed.
 update public.orders set ordered_on=p_ordered_on,total=total_amount,apply_interest=p_apply_interest,note=p_note where id=o.id;
 update public.payments set paid_on=p_ordered_on where order_id=o.id and kind='down_payment' and deleted_at is null and paid_on<>p_ordered_on;
 perform public.mhq_assert_order_payments(o.id);
 update public.order_items set deleted_at=clock_timestamp() where order_id=o.id and deleted_at is null;
 for entry in select value from jsonb_array_elements(new_items) loop
  insert into public.order_items(owner_id,order_id,product_id,name,quantity,price) values(uid,o.id,(entry->>'product_id')::uuid,entry->>'name',(entry->>'quantity')::integer,(entry->>'price')::bigint);
 end loop;
 return o.id;
end $$;

create or replace function public.record_payment(p_id uuid,p_order_id uuid,p_amount bigint,p_paid_on date,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); o public.orders%rowtype; previous_date date;
begin
 select * into o from public.orders where id=p_order_id and owner_id=uid and deleted_at is null;
 if not found or not exists(select 1 from public.customers where id=o.customer_id and owner_id=uid and deleted_at is null) then raise exception 'Đơn hàng hoặc khách hàng đã xoá'; end if;
 if exists(select 1 from public.payments where id=p_id and order_id=o.id and owner_id=uid) then
  if not exists(select 1 from public.payments where id=p_id and deleted_at is null and amount=p_amount and paid_on=p_paid_on and note=coalesce(p_note,'')) then raise exception 'Yêu cầu đã lưu với thông tin khác hoặc đã xoá. Hãy đóng và mở lại biểu mẫu.'; end if;
  return p_id;
 end if;
 select max(paid_on) into previous_date from public.payments where order_id=o.id and deleted_at is null;
 if p_paid_on is null or p_paid_on<o.ordered_on or p_paid_on<coalesce(previous_date,o.ordered_on) or p_paid_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày thu phải từ lần thu gần nhất đến hôm nay'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Số tiền thu phải lớn hơn 0'; end if;
 insert into public.payments(id,owner_id,order_id,amount,paid_on,kind,note) values(p_id,uid,o.id,p_amount,p_paid_on,'installment',coalesce(p_note,''));
 perform public.mhq_assert_order_payments(o.id);
 return p_id;
end $$;

create function public.update_payment(p_id uuid,p_order_id uuid,p_version integer,p_amount bigint,p_paid_on date,p_note text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); p public.payments%rowtype;
begin
 select * into p from public.payments where id=p_id and order_id=p_order_id and owner_id=uid and deleted_at is null;
 if not found then raise exception 'Khoản thu không tồn tại hoặc đã xoá'; end if;
 if not exists(select 1 from public.orders o join public.customers c on c.id=o.customer_id where o.id=p.order_id and o.owner_id=uid and o.deleted_at is null and c.deleted_at is null) then raise exception 'Hãy khôi phục khách hàng và đơn hàng trước'; end if;
 if p_version is distinct from p.version then raise exception 'Khoản thu đã thay đổi. Hãy làm mới dữ liệu rồi mở lại biểu mẫu.'; end if;
 update public.payments set amount=p_amount,paid_on=p_paid_on,note=p_note where id=p.id;
 perform public.mhq_assert_order_payments(p.order_id);
 return p.id;
end $$;

-- Deleting a parent hides its descendants without deleting or overwriting their own
-- deletion flags. Restoring a parent never resurrects separately deleted children.
create function public.set_record_deleted(p_type text,p_id uuid,p_deleted boolean) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); t text; r record; parent_id uuid; is_hidden boolean;
begin
 t:=case p_type when 'customer' then 'customers' when 'product' then 'products' when 'note' then 'customer_notes' when 'order' then 'orders' when 'payment' then 'payments' end;
 if t is null or p_deleted is null then raise exception 'Loại dữ liệu không hợp lệ'; end if;
 execute format('select * from public.%I where id=$1 and owner_id=$2',t) into r using p_id,uid;
 if r.id is null then raise exception 'Không tìm thấy dữ liệu'; end if;
 if (r.deleted_at is not null)=p_deleted then return p_id; end if;
 if p_type in ('order','note') then
  parent_id:=r.customer_id;
  select deleted_at is not null into is_hidden from public.customers where id=parent_id and owner_id=uid;
  if is_hidden then raise exception 'Hãy khôi phục khách hàng trước'; end if;
 elsif p_type='payment' then
  parent_id:=r.order_id;
  select o.deleted_at is not null or c.deleted_at is not null into is_hidden from public.orders o join public.customers c on c.id=o.customer_id where o.id=parent_id and o.owner_id=uid;
  if is_hidden then raise exception 'Hãy khôi phục khách hàng và đơn hàng trước'; end if;
 end if;
 execute format('update public.%I set deleted_at=$1 where id=$2 and owner_id=$3',t) using case when p_deleted then clock_timestamp() else null end,p_id,uid;
 if p_type='payment' then perform public.mhq_assert_order_payments(parent_id); end if;
 if p_type='order' and not p_deleted then perform public.mhq_assert_order_payments(p_id); end if;
 return p_id;
end $$;

-- Private helpers are not public RPCs; only narrowly scoped mutations are executable.
revoke all on function public.mhq_touch_record(),public.mhq_lock_store(),public.mhq_assert_order_payments(uuid) from public,anon,authenticated;
revoke all on function public.save_customer(text,text,text,boolean,uuid),public.save_product(text,bigint,uuid),public.save_note(uuid,text,uuid),public.update_order(uuid,integer,date,boolean,jsonb,text),public.update_payment(uuid,uuid,integer,bigint,date,text),public.set_record_deleted(text,uuid,boolean) from public,anon;
grant execute on function public.save_customer(text,text,text,boolean,uuid),public.save_product(text,bigint,uuid),public.save_note(uuid,text,uuid),public.update_order(uuid,integer,date,boolean,jsonb,text),public.update_payment(uuid,uuid,integer,bigint,date,text),public.set_record_deleted(text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
