import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app';
test('NestJS health works and store APIs require authentication',async()=>{
 const app=await createApp();const server=app.listen(0,'127.0.0.1');
 try{
  await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`;
  assert.equal((await fetch(base+'/api/health')).status,200);
  for(const [path,method] of [['state','GET'],['customers','POST'],['products','POST'],['settings','PATCH'],['orders','POST'],['orders/00000000-0000-4000-8000-000000000000/payments','POST']]){
   const result=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:'{}'})});assert.equal(result.status,401,path+' should require authentication');
  }
 }finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
