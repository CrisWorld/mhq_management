import { createClient } from '@supabase/supabase-js';
import type { State, Order, Payment } from '../shared/types';
import { balanceAt, todayVN } from '../shared/finance';
export const supabase=createClient(import.meta.env.VITE_SUPABASE_URL||'https://unconfigured.supabase.co',import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'unconfigured');
export const money=(n:number)=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:0}).format(n)+' ₫';
export const shortMoney=(n:number)=>n>=1e9?`${+(n/1e9).toFixed(1)} tỷ`:n>=1e6?`${+(n/1e6).toFixed(1)} tr`:n>=1000?`${+(n/1000).toFixed(0)}k`:String(n);
export const dateText=(s:string)=>new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(s.length===10?s+'T12:00:00+07:00':s));
export const initials=(s:string)=>s.split(' ').filter(Boolean).slice(-2).map(w=>w[0]).join('').toUpperCase();
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const demoKey='mhq-demo-v1';
export function demoState():State {
 try {const stored=sessionStorage.getItem(demoKey);if(stored)return JSON.parse(stored);}catch{/* start a fresh preview */}
 const today=todayVN(), month=today.slice(0,7);
 const prevDate=new Date(today+'T12:00:00Z');prevDate.setUTCMonth(prevDate.getUTCMonth()-2);const old=prevDate.toISOString().slice(0,7)+'-12';
 const created_at=old+'T05:00:00Z';
 const customers=[{id:'demo-c1',name:'Nguyễn Thị Mai',phone:'0900000001',address:'Địa chỉ mẫu · Quận Hải Châu, Đà Nẵng',apply_interest:true,created_at},{id:'demo-c2',name:'Trần Văn An',phone:'0900000002',address:'Địa chỉ mẫu · Quận Thanh Khê, Đà Nẵng',apply_interest:true,created_at},{id:'demo-c3',name:'Lê Thị Hương',phone:'0900000003',address:'Địa chỉ mẫu · Quận Sơn Trà, Đà Nẵng',apply_interest:false,created_at}];
 const products=[{id:'demo-p1',name:'Sofa vải Oslo',price:12500000,created_at},{id:'demo-p2',name:'Bàn ăn gỗ sồi 6 ghế',price:8900000,created_at},{id:'demo-p3',name:'Tủ đầu giường',price:1500000,created_at}];
 const orders:Order[]=[{id:'demo-o1',code:'DH-0001',customer_id:'demo-c1',ordered_on:old,total:12500000,apply_interest:true,interest_per_million:20000,note:'Giao hàng buổi sáng.',created_at,items:[{product_id:'demo-p1',name:products[0].name,quantity:1,price:12500000}],payments:[{id:'demo-pay1',order_id:'demo-o1',amount:2500000,paid_on:old,kind:'down_payment',note:'Trả trước',created_at}]},{id:'demo-o2',code:'DH-0002',customer_id:'demo-c2',ordered_on:old,total:8900000,apply_interest:true,interest_per_million:20000,note:'',created_at,items:[{product_id:'demo-p2',name:products[1].name,quantity:1,price:8900000}],payments:[{id:'demo-pay2',order_id:'demo-o2',amount:3900000,paid_on:old,kind:'down_payment',note:'Trả trước',created_at},{id:'demo-pay3',order_id:'demo-o2',amount:1000000,paid_on:month+'-05',kind:'installment',note:'Chuyển khoản',created_at:month+'-05T03:00:00Z'}]},{id:'demo-o3',code:'DH-0003',customer_id:'demo-c3',ordered_on:today,total:3000000,apply_interest:false,interest_per_million:20000,note:'',created_at:today+'T03:00:00Z',items:[{product_id:'demo-p3',name:products[2].name,quantity:2,price:1500000}],payments:[]}];
 return {store:{owner_id:'demo',name:'Nội thất MHQ',interest_per_million:20000},customers,products,notes:[{id:'demo-n1',customer_id:'demo-c1',content:'Khách hẹn trả góp vào ngày 25 hằng tháng.',created_at}],orders};
}
export async function request(path:string,method='GET',body?:unknown){
 const {data:{session}}=await supabase.auth.getSession();
 const res=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+session?.access_token},body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>({message:'Máy chủ chưa phản hồi. Vui lòng thử lại.'}));
 if(!res.ok)throw new Error(Array.isArray(data.message)?'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.':data.message||'Không thể hoàn tất. Vui lòng thử lại.');
 return data;
}
export function demoRequest(state:State,path:string,method:string,body:any):{state:State;result:any}{
 const s=structuredClone(state),id=crypto.randomUUID(),created_at=new Date().toISOString();let result:any;
 if(path==='customers'&&method==='POST'){result={...body,id,created_at};s.customers.push(result);}
 else if(/^customers\/[^/]+$/.test(path)&&method==='PATCH'){result=s.customers.find(c=>c.id===path.split('/')[1]);Object.assign(result,body);}
 else if(path==='products'&&method==='POST'){result={...body,id,created_at};s.products.push(result);}
 else if(/^products\/[^/]+$/.test(path)){result=s.products.find(p=>p.id===path.split('/')[1]);Object.assign(result,body);}
 else if(path.endsWith('/notes')){result={...body,id,created_at,customer_id:path.split('/')[1]};s.notes.push(result);}
 else if(path==='settings'){Object.assign(s.store,body);result=s.store;}
 else if(path==='orders'){
  const existing=s.orders.find(o=>o.id===body.id);if(existing)return {state:s,result:existing};
  const items=body.items.map((i:any)=>{const p=s.products.find(p=>p.id===i.product_id)!;return {...i,name:p.name,price:p.price};});
  const total=items.reduce((a:number,i:any)=>a+i.quantity*i.price,0);
  if(body.down_payment>total)throw new Error('Tiền trả trước vượt tổng đơn.');
  result={...body,total,code:'DH-'+String(s.orders.length+1).padStart(4,'0'),interest_per_million:s.store.interest_per_million,items,created_at,payments:body.down_payment>0?[{id,order_id:body.id,amount:body.down_payment,paid_on:body.ordered_on,kind:'down_payment',note:'Trả trước',created_at}]:[]};s.orders.push(result);
 }else if(path.endsWith('/payments')){
  const order=s.orders.find(o=>o.id===path.split('/')[1])!;
  const previous=order.payments.map(p=>p.paid_on).sort().at(-1)||order.ordered_on;
  if(order.payments.some(p=>p.id===body.id))return {state:s,result:body};
  if(body.paid_on<previous||body.paid_on>todayVN())throw new Error('Ngày thu phải từ lần thu gần nhất đến hôm nay.');
  if(body.amount<=0||body.amount>balanceAt(order,body.paid_on).total)throw new Error('Số tiền thu vượt số nợ tại ngày thu.');
  result={...body,order_id:order.id,kind:'installment',created_at};order.payments.push(result as Payment);
 }
 sessionStorage.setItem(demoKey,JSON.stringify(s));return {state:s,result};
}
