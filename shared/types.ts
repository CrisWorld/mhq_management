export interface Store { owner_id:string; name:string; interest_per_million:number; }
export interface Customer { id:string; name:string; phone:string; address:string; apply_interest:boolean; created_at:string; }
export interface Product { id:string; name:string; price:number; created_at:string; }
export interface Note { id:string; customer_id:string; content:string; created_at:string; }
export interface Item { product_id:string; name:string; quantity:number; price:number; }
export interface Payment { id:string; order_id:string; amount:number; paid_on:string; kind:'down_payment'|'installment'; note:string; created_at:string; }
export interface Order { id:string; code:string; customer_id:string; ordered_on:string; total:number; apply_interest:boolean; interest_per_million:number; note:string; created_at:string; items:Item[]; payments:Payment[]; }
export interface State { store:Store; customers:Customer[]; products:Product[]; notes:Note[]; orders:Order[]; }
export interface LedgerEntry { date:string; type:'interest'|'payment'; amount:number; principal:number; interest:number; label:string; }
export interface Balance { principal:number; interest:number; total:number; paid:number; accrued:number; ledger:LedgerEntry[]; }
