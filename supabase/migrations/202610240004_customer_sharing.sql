-- Each link is a 256-bit bearer capability scoped to one customer. Owners can
-- retrieve/reuse it on any device; anonymous users can only call the read RPC.
create table public.customer_share_links (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.stores(owner_id),
 customer_id uuid not null,
 token text not null unique default encode(extensions.gen_random_bytes(32),'hex') check(token ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 revoked_at timestamptz,
 foreign key(customer_id,owner_id) references public.customers(id,owner_id)
);
create unique index customer_share_links_active_idx on public.customer_share_links(owner_id,customer_id) where revoked_at is null;
alter table public.customer_share_links enable row level security;
create policy owner_customer_share_links on public.customer_share_links for select to authenticated using(owner_id=(select auth.uid()));
revoke all on public.customer_share_links from public,anon,authenticated;
grant select on public.customer_share_links to authenticated;

create function public.get_customer_share(p_customer_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=auth.uid() and deleted_at is null) then raise exception 'Không tìm thấy khách hàng'; end if;
 select jsonb_build_object('token',token,'created_at',created_at) into result from public.customer_share_links where customer_id=p_customer_id and owner_id=auth.uid() and revoked_at is null;
 return result;
end $$;

create function public.create_customer_share(p_customer_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store(); result jsonb;
begin
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=uid and deleted_at is null) then raise exception 'Không tìm thấy khách hàng'; end if;
 -- Repeated taps and retries keep the same URL until explicitly revoked.
 select public.get_customer_share(p_customer_id) into result;
 if result is not null then return result; end if;
 insert into public.customer_share_links(owner_id,customer_id) values(uid,p_customer_id)
 returning jsonb_build_object('token',token,'created_at',created_at) into result;
 return result;
end $$;

create function public.revoke_customer_share(p_customer_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=public.mhq_lock_store();
begin
 if not exists(select 1 from public.customers where id=p_customer_id and owner_id=uid and deleted_at is null) then raise exception 'Không tìm thấy khách hàng'; end if;
 update public.customer_share_links set revoked_at=clock_timestamp() where owner_id=uid and customer_id=p_customer_id and revoked_at is null;
 return true;
end $$;

-- Restoring a deleted customer must never reactivate an old shared URL.
create function public.mhq_revoke_deleted_customer_shares() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.deleted_at is null and new.deleted_at is not null then
  update public.customer_share_links set revoked_at=clock_timestamp() where customer_id=new.id and owner_id=new.owner_id and revoked_at is null;
 end if;
 return new;
end $$;
create trigger revoke_deleted_customer_shares after update of deleted_at on public.customers for each row execute function public.mhq_revoke_deleted_customer_shares();

-- Single-snapshot read; allowlist columns here too, because this RPC is directly
-- callable with the public Supabase key. Never include internal notes/contact data.
create function public.read_customer_share(p_token text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare shared record; result jsonb;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then return null; end if;
 select l.owner_id,l.customer_id,c.name as customer_name,s.name as store_name into shared
 from public.customer_share_links l
 join public.customers c on c.id=l.customer_id and c.owner_id=l.owner_id and c.deleted_at is null
 join public.stores s on s.owner_id=l.owner_id
 where l.token=p_token and l.revoked_at is null;
 if not found then return null; end if;
 select jsonb_build_object('store_name',shared.store_name,'customer_name',shared.customer_name,'orders',coalesce(jsonb_agg(
  jsonb_build_object('code',o.code,'ordered_on',o.ordered_on,'total',o.total,'apply_interest',o.apply_interest,'interest_per_million',o.interest_per_million,
   'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity,'price',i.price) order by i.id) from public.order_items i where i.order_id=o.id and i.owner_id=shared.owner_id and i.deleted_at is null),'[]'::jsonb),
   'payments',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'amount',p.amount,'paid_on',p.paid_on,'kind',p.kind,'note','','created_at',p.created_at) order by p.paid_on,p.created_at,p.id) from public.payments p where p.order_id=o.id and p.owner_id=shared.owner_id and p.deleted_at is null),'[]'::jsonb)
  ) order by o.ordered_on desc,o.created_at desc,o.id
 ),'[]'::jsonb)) into result
 from public.orders o where o.customer_id=shared.customer_id and o.owner_id=shared.owner_id and o.deleted_at is null;
 return result;
end $$;
revoke all on function public.get_customer_share(uuid),public.create_customer_share(uuid),public.revoke_customer_share(uuid),public.read_customer_share(text),public.mhq_revoke_deleted_customer_shares() from public,anon,authenticated;
grant execute on function public.get_customer_share(uuid),public.create_customer_share(uuid),public.revoke_customer_share(uuid) to authenticated;
grant execute on function public.read_customer_share(text) to anon,authenticated;
notify pgrst,'reload schema';
