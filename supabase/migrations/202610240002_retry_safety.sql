-- Reject a reused request ID with a different financial payload.
create or replace function public.create_order(p_id uuid,p_customer_id uuid,p_ordered_on date,p_apply_interest boolean,p_items jsonb,p_down_payment bigint default 0,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); rate integer; entry jsonb; prod public.products%rowtype; total_amount bigint:=0; qty integer; item_count integer;
begin
 if uid is null then raise exception 'Vui lòng đăng nhập'; end if;
 -- Serialize requests with the same id; retries must not produce a second order.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.orders where id=p_id and owner_id=uid) then
  if not exists(select 1 from public.orders o where o.id=p_id and o.customer_id=p_customer_id and o.ordered_on=p_ordered_on and o.apply_interest=p_apply_interest and o.note=p_note)
   or p_down_payment<>coalesce((select sum(amount) from public.payments where order_id=p_id and kind='down_payment'),0)
   or (select jsonb_agg(jsonb_build_object('product_id',product_id,'quantity',quantity) order by product_id,quantity) from public.order_items where order_id=p_id)
      is distinct from (select jsonb_agg(value order by (value->>'product_id')::uuid,(value->>'quantity')::int) from jsonb_array_elements(p_items))
   then raise exception 'Yêu cầu đã lưu với thông tin khác. Hãy đóng và mở lại biểu mẫu.'; end if;
  return p_id;
 end if;
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=uid) then raise exception 'Khách hàng không tồn tại'; end if;
 if p_ordered_on is null or p_ordered_on<'2000-01-01' or p_ordered_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày mua không hợp lệ'; end if;
 if p_apply_interest is null or p_down_payment is null or p_note is null then raise exception 'Thiếu thông tin đơn hàng'; end if;
 if jsonb_typeof(p_items)<>'array' then raise exception 'Danh sách sản phẩm không hợp lệ'; end if;
 item_count:=jsonb_array_length(p_items);
 if item_count<1 or item_count>100 then raise exception 'Đơn cần có từ 1 đến 100 sản phẩm'; end if;
 select interest_per_million into rate from public.stores where owner_id=uid;
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into prod from public.products where id=(entry->>'product_id')::uuid and owner_id=uid for share;
  if not found then raise exception 'Sản phẩm không tồn tại'; end if;
  if (entry->>'quantity') is null or (entry->>'quantity')!~'^[0-9]+$' then raise exception 'Số lượng không hợp lệ'; end if;
  qty:=(entry->>'quantity')::integer;
  if qty<1 or qty>10000 then raise exception 'Số lượng không hợp lệ'; end if;
  total_amount:=total_amount+prod.price*qty;
 end loop;
 if total_amount<=0 or total_amount>1000000000000 or p_down_payment<0 or p_down_payment>total_amount then raise exception 'Tổng đơn hoặc tiền trả trước không hợp lệ'; end if;
 insert into public.orders(id,owner_id,customer_id,ordered_on,total,apply_interest,interest_per_million,note) values(p_id,uid,p_customer_id,p_ordered_on,total_amount,p_apply_interest,rate,p_note);
 for entry in select value from jsonb_array_elements(p_items) loop
  select * into prod from public.products where id=(entry->>'product_id')::uuid and owner_id=uid;
  insert into public.order_items(owner_id,order_id,product_id,name,quantity,price) values(uid,p_id,prod.id,prod.name,(entry->>'quantity')::integer,prod.price);
 end loop;
 if p_down_payment>0 then insert into public.payments(id,owner_id,order_id,amount,paid_on,kind,note) values(gen_random_uuid(),uid,p_id,p_down_payment,p_ordered_on,'down_payment','Trả trước khi mua'); end if;
 return p_id;
end $$;

create or replace function public.record_payment(p_id uuid,p_order_id uuid,p_amount bigint,p_paid_on date,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); o public.orders%rowtype; due jsonb; previous_date date;
begin
 if uid is null then raise exception 'Vui lòng đăng nhập'; end if;
 select * into o from public.orders where id=p_order_id and owner_id=uid for update;
 if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
 if exists(select 1 from public.payments where id=p_id and order_id=o.id and owner_id=uid) then
  if not exists(select 1 from public.payments where id=p_id and amount=p_amount and paid_on=p_paid_on and note=coalesce(p_note,'')) then raise exception 'Yêu cầu đã lưu với thông tin khác. Hãy đóng và mở lại biểu mẫu.'; end if;
  return p_id;
 end if;
 select max(paid_on) into previous_date from public.payments where order_id=o.id;
 if p_paid_on is null or p_paid_on<o.ordered_on or p_paid_on<coalesce(previous_date,o.ordered_on) or p_paid_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày thu phải từ lần thu gần nhất đến hôm nay'; end if;
 due:=public.order_balance(o.id,p_paid_on);
 if p_amount is null or p_amount<=0 or p_amount>(due->>'total')::bigint then raise exception 'Tiền thu phải lớn hơn 0 và không vượt số nợ tại ngày thu'; end if;
 insert into public.payments(id,owner_id,order_id,amount,paid_on,kind,note) values(p_id,uid,o.id,p_amount,p_paid_on,'installment',coalesce(p_note,''));
 return p_id;
end $$;
