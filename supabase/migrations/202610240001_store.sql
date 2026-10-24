-- Integer VND, owner isolation and immutable financial records.
create table public.stores (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Nội thất gia đình' check (char_length(name) between 1 and 120),
 interest_per_million integer not null default 20000 check (interest_per_million between 0 and 1000000),
 created_at timestamptz not null default now()
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.stores(owner_id),
 name text not null check(char_length(trim(name)) between 1 and 120),
 phone text not null default '' check(char_length(phone)<=25), address text not null default '' check(char_length(address)<=500),
 apply_interest boolean not null default true, created_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.stores(owner_id),
 name text not null check(char_length(trim(name)) between 1 and 200),
 price bigint not null check(price between 0 and 100000000000), created_at timestamptz not null default now(), unique(id,owner_id)
);
create table public.customer_notes (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.stores(owner_id), customer_id uuid not null,
 content text not null check(char_length(trim(content)) between 1 and 2000), created_at timestamptz not null default now(),
 foreign key(customer_id,owner_id) references public.customers(id,owner_id)
);
create table public.orders (
 id uuid primary key, owner_id uuid not null references public.stores(owner_id), customer_id uuid not null,
 code text not null default ('DH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
 ordered_on date not null, total bigint not null check(total between 1 and 1000000000000),
 apply_interest boolean not null, interest_per_million integer not null check(interest_per_million between 0 and 1000000),
 note text not null default '' check(char_length(note)<=2000), created_at timestamptz not null default now(),
 unique(id,owner_id), foreign key(customer_id,owner_id) references public.customers(id,owner_id)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null, order_id uuid not null, product_id uuid not null,
 name text not null, quantity integer not null check(quantity between 1 and 10000), price bigint not null check(price between 0 and 100000000000),
 foreign key(order_id,owner_id) references public.orders(id,owner_id), foreign key(product_id,owner_id) references public.products(id,owner_id)
);
create table public.payments (
 id uuid primary key, owner_id uuid not null, order_id uuid not null,
 amount bigint not null check(amount between 1 and 1000000000000), paid_on date not null,
 kind text not null check(kind in ('down_payment','installment')), note text not null default '' check(char_length(note)<=1000),
 created_at timestamptz not null default now(), foreign key(order_id,owner_id) references public.orders(id,owner_id)
);
create index customers_owner_idx on public.customers(owner_id);
create index products_owner_idx on public.products(owner_id);
create index notes_customer_idx on public.customer_notes(owner_id,customer_id,created_at);
create index orders_customer_idx on public.orders(owner_id,customer_id,ordered_on);
create index order_items_order_idx on public.order_items(order_id);
create index payments_order_idx on public.payments(order_id,paid_on,created_at,id);

alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.customer_notes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
create policy owner_store on public.stores for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_customers on public.customers for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_products on public.products for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_notes on public.customer_notes for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy owner_orders on public.orders for select to authenticated using(owner_id=(select auth.uid()));
create policy owner_items on public.order_items for select to authenticated using(owner_id=(select auth.uid()));
create policy owner_payments on public.payments for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.stores,public.customers,public.products,public.customer_notes,public.orders,public.order_items,public.payments from anon,authenticated;
grant select,insert,update on public.stores,public.customers,public.products to authenticated;
grant select,insert on public.customer_notes to authenticated;
grant select on public.orders,public.order_items,public.payments to authenticated;

create function public.order_balance(p_order_id uuid,p_as_of date) returns jsonb
language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare o public.orders%rowtype; p record; principal bigint; interest bigint:=0; next_month date; charge bigint;
begin
 select * into o from public.orders where id=p_order_id;
 if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
 if p_as_of<o.ordered_on then return jsonb_build_object('principal',0,'interest',0,'total',0); end if;
 principal:=o.total; next_month:=(date_trunc('month',o.ordered_on)+interval '1 month')::date;
 for p in select * from public.payments where order_id=o.id and paid_on<=p_as_of order by paid_on,created_at,id loop
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

create function public.create_order(p_id uuid,p_customer_id uuid,p_ordered_on date,p_apply_interest boolean,p_items jsonb,p_down_payment bigint default 0,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); rate integer; entry jsonb; prod public.products%rowtype; total_amount bigint:=0; qty integer; item_count integer;
begin
 if uid is null then raise exception 'Vui lòng đăng nhập'; end if;
 -- Serialize requests with the same id; retries must not produce a second order.
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 if exists(select 1 from public.orders where id=p_id and owner_id=uid) then return p_id; end if;
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

create function public.record_payment(p_id uuid,p_order_id uuid,p_amount bigint,p_paid_on date,p_note text default '') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); o public.orders%rowtype; due jsonb; previous_date date;
begin
 if uid is null then raise exception 'Vui lòng đăng nhập'; end if;
 select * into o from public.orders where id=p_order_id and owner_id=uid for update;
 if not found then raise exception 'Không tìm thấy đơn hàng'; end if;
 if exists(select 1 from public.payments where id=p_id and order_id=o.id and owner_id=uid) then return p_id; end if;
 select max(paid_on) into previous_date from public.payments where order_id=o.id;
 if p_paid_on is null or p_paid_on<o.ordered_on or p_paid_on<coalesce(previous_date,o.ordered_on) or p_paid_on>(now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Ngày thu phải từ lần thu gần nhất đến hôm nay'; end if;
 due:=public.order_balance(o.id,p_paid_on);
 if p_amount is null or p_amount<=0 or p_amount>(due->>'total')::bigint then raise exception 'Tiền thu phải lớn hơn 0 và không vượt số nợ tại ngày thu'; end if;
 insert into public.payments(id,owner_id,order_id,amount,paid_on,kind,note) values(p_id,uid,o.id,p_amount,p_paid_on,'installment',coalesce(p_note,''));
 return p_id;
end $$;
revoke all on function public.order_balance(uuid,date),public.create_order(uuid,uuid,date,boolean,jsonb,bigint,text),public.record_payment(uuid,uuid,bigint,date,text) from public,anon;
grant execute on function public.order_balance(uuid,date),public.create_order(uuid,uuid,date,boolean,jsonb,bigint,text),public.record_payment(uuid,uuid,bigint,date,text) to authenticated;
