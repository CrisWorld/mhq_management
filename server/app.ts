import 'reflect-metadata';
import { BadRequestException, Body, Controller, ExecutionContext, Get, Injectable, Module, Param, Patch, Post, Req, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import express, { type Request } from 'express';

type AuthRequest=Request & {db:SupabaseClient;uid:string};
const config=()=>({url:process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY});
@Injectable()
class AuthGuard {
 async canActivate(context:ExecutionContext){
  const req=context.switchToHttp().getRequest<AuthRequest>();
  const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if(!token)throw new UnauthorizedException('Vui lòng đăng nhập');
  const {url,key}=config(); if(!url||!key)throw new BadRequestException('Chưa cấu hình Supabase');
  const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
  req.db=db;req.uid=data.user.id;return true;
 }
}
class CustomerDto {
 @IsString() @MinLength(1) @MaxLength(120) name!:string;
 @IsString() @MaxLength(25) phone!:string;
 @IsString() @MaxLength(500) address!:string;
 @IsBoolean() apply_interest!:boolean;
}
class ProductDto {
 @IsString() @MinLength(1) @MaxLength(200) name!:string;
 @IsInt() @Min(0) @Max(100000000000) price!:number;
}
class NoteDto { @IsString() @MinLength(1) @MaxLength(2000) content!:string; }
class SettingsDto {
 @IsString() @MinLength(1) @MaxLength(120) name!:string;
 @IsInt() @Min(0) @Max(1000000) interest_per_million!:number;
}
class ItemDto { @IsUUID() product_id!:string; @IsInt() @Min(1) @Max(10000) quantity!:number; }
class OrderDto {
 @IsUUID() id!:string; @IsUUID() customer_id!:string;
 @IsDateString({strict:true}) ordered_on!:string;
 @IsBoolean() apply_interest!:boolean;
 @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({each:true}) @Type(()=>ItemDto) items!:ItemDto[];
 @IsInt() @Min(0) @Max(1000000000000) down_payment!:number;
 @IsString() @MaxLength(2000) note!:string;
}
class PaymentDto {
 @IsUUID() id!:string;
 @IsInt() @Min(1) @Max(1000000000000) amount!:number;
 @IsDateString({strict:true}) paid_on!:string;
 @IsString() @MaxLength(1000) note!:string;
}
function unwrap<T>(result:{data:T;error:any}):T { if(result.error)throw new BadRequestException(result.error.message||'Không thể lưu dữ liệu');return result.data; }
async function all(db:SupabaseClient,table:string){
 const rows:any[]=[]; let from=0;
 for(;;){const page=unwrap(await db.from(table).select('*').order('id').range(from,from+999))||[];rows.push(...page);if(page.length<1000)return rows;from+=1000;}
}
@Controller('api')
class PublicController { @Get('health') health(){return {status:'ok',service:'MHQ NestJS API'};} }
@Controller('api') @UseGuards(AuthGuard)
class StoreController {
 @Get('state') async state(@Req() req:AuthRequest){
  const {db,uid}=req;
  // ignoreDuplicates preserves a previously saved store during simultaneous first requests.
  unwrap(await db.from('stores').upsert({owner_id:uid},{onConflict:'owner_id',ignoreDuplicates:true}));
  const store=unwrap(await db.from('stores').select('*').single());
  const [customers,products,notes,orders,items,payments]=await Promise.all(['customers','products','customer_notes','orders','order_items','payments'].map(t=>all(db,t)));
  return {store,customers,products,notes,orders:orders.map(o=>({...o,items:items.filter(i=>i.order_id===o.id),payments:payments.filter(p=>p.order_id===o.id)}))};
 }
 @Post('customers') async customer(@Req() req:AuthRequest,@Body(new ValidationPipe({expectedType:CustomerDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:CustomerDto){return unwrap(await req.db.from('customers').insert({...dto,name:dto.name.trim(),owner_id:req.uid}).select().single());}
 @Patch('customers/:id') async editCustomer(@Req() req:AuthRequest,@Param('id') id:string,@Body(new ValidationPipe({expectedType:CustomerDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:CustomerDto){return unwrap(await req.db.from('customers').update({...dto,name:dto.name.trim()}).eq('id',id).select().single());}
 @Post('products') async product(@Req() req:AuthRequest,@Body(new ValidationPipe({expectedType:ProductDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:ProductDto){return unwrap(await req.db.from('products').insert({...dto,name:dto.name.trim(),owner_id:req.uid}).select().single());}
 @Patch('products/:id') async editProduct(@Req() req:AuthRequest,@Param('id') id:string,@Body(new ValidationPipe({expectedType:ProductDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:ProductDto){return unwrap(await req.db.from('products').update({...dto,name:dto.name.trim()}).eq('id',id).select().single());}
 @Post('customers/:id/notes') async note(@Req() req:AuthRequest,@Param('id') id:string,@Body(new ValidationPipe({expectedType:NoteDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:NoteDto){return unwrap(await req.db.from('customer_notes').insert({...dto,content:dto.content.trim(),customer_id:id,owner_id:req.uid}).select().single());}
 @Patch('settings') async settings(@Req() req:AuthRequest,@Body(new ValidationPipe({expectedType:SettingsDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:SettingsDto){return unwrap(await req.db.from('stores').update({...dto,name:dto.name.trim()}).eq('owner_id',req.uid).select().single());}
 @Post('orders') async order(@Req() req:AuthRequest,@Body(new ValidationPipe({expectedType:OrderDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:OrderDto){return {id:unwrap(await req.db.rpc('create_order',{p_id:dto.id,p_customer_id:dto.customer_id,p_ordered_on:dto.ordered_on,p_apply_interest:dto.apply_interest,p_items:dto.items,p_down_payment:dto.down_payment,p_note:dto.note}))};}
 @Post('orders/:id/payments') async payment(@Req() req:AuthRequest,@Param('id') id:string,@Body(new ValidationPipe({expectedType:PaymentDto,whitelist:true,forbidNonWhitelisted:true,transform:true})) dto:PaymentDto){return {id:unwrap(await req.db.rpc('record_payment',{p_id:dto.id,p_order_id:id,p_amount:dto.amount,p_paid_on:dto.paid_on,p_note:dto.note}))};}
}
@Module({controllers:[PublicController,StoreController],providers:[AuthGuard]})
class AppModule {}
let appPromise:Promise<express.Express>|undefined;
export function createApp(){
 return appPromise??=(async()=>{
  const instance=express(); instance.disable('x-powered-by');
  instance.use(express.json({limit:'64kb'}));
  instance.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  const app=await NestFactory.create(AppModule,new ExpressAdapter(instance),{logger:['error','warn']});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.init();return instance;
 })();
}
