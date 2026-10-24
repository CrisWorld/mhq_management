// Creates an isolated, temporary synthetic account, tests the deployed API, and removes only its fixtures.
import {randomUUID,randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {database} from './db';
import {todayVN} from '../shared/finance';
const db=database(),uid=randomUUID(),email=`mhq-check-${uid}@example.test`,password=randomBytes(32).toString('base64url');
const base=process.env.TEST_BASE_URL||'http://localhost:3001';
const client=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
let checks=0,token='';
async function call(path:string,method='GET',body?:unknown,expected=200){const r=await fetch(base+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(data));checks++;return data;}
try{
 await db.connect();
 await db.query(`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,reauthentication_token) values ('00000000-0000-0000-0000-000000000000',$1,'authenticated','authenticated',$2,crypt($3,gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','','','')`,[uid,email,password]);
 await db.query("insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at) values ($1::uuid,$2::uuid,$2::text,jsonb_build_object('sub',$2::text,'email',$3::text),'email',now(),now())",[randomUUID(),uid,email]);
 const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;assert.ok(data.session);token=data.session.access_token;console.log('PASS Supabase login with isolated temporary fixture');checks++;
 const initial=await call('state');assert.equal(initial.customers.length,0);assert.equal(initial.store.owner_id,uid);
 await call('customers','POST',{name:'KH kiểm thử',phone:'0900000099',address:'Địa chỉ mẫu',apply_interest:true,unexpected:'blocked'},400);
 const customer=await call('customers','POST',{name:'KH kiểm thử',phone:'0900000099',address:'Địa chỉ mẫu',apply_interest:true},201);
 const product=await call('products','POST',{name:'SP kiểm thử',price:500000},201);
 await call('customers/'+customer.id+'/notes','POST',{content:'Ghi chú kiểm thử'},201);
 const oid=randomUUID(),body={id:oid,customer_id:customer.id,ordered_on:'2026-09-15',apply_interest:true,items:[{product_id:product.id,quantity:2}],down_payment:200000,note:'Kiểm thử'};
 await call('orders','POST',body,201);await call('orders','POST',body,201);
 let state=await call('state');assert.equal(state.orders.length,1);assert.equal(state.orders[0].total,1000000);assert.equal(state.orders[0].payments.length,1);assert.equal(state.notes.length,1);
 const pay={id:randomUUID(),amount:116000,paid_on:todayVN(),note:'Tiền mặt kiểm thử'};
 await call('orders/'+oid+'/payments','POST',pay,201);await call('orders/'+oid+'/payments','POST',pay,201);
 await call('orders/'+oid+'/payments','POST',{...pay,id:randomUUID(),amount:999999999},400);
 await call('settings','PATCH',{name:'Cửa hàng kiểm thử',interest_per_million:30000});
 await call('products/'+product.id,'PATCH',{name:'Giá mới',price:900000});
 state=await call('state');assert.equal(state.orders[0].payments.length,2);assert.equal(state.orders[0].interest_per_million,20000);assert.equal(state.orders[0].items[0].price,500000);
 console.log(`PASS ${checks} authenticated HTTP checks including validation, atomic order, payments and snapshots`);
}finally{
 await client.auth.signOut().catch(()=>{});
 await db.query('begin');
 try{for(const table of ['payments','order_items','orders','customer_notes','products','customers','stores'])await db.query('delete from public.'+table+' where owner_id=$1',[uid]);await db.query('delete from auth.users where id=$1',[uid]);await db.query('commit');console.log('Removed isolated synthetic account and all its test records.');}catch(e){await db.query('rollback');throw e;}finally{await db.end();}
}
