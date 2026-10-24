export interface Store {
  owner_id: string;
  name: string;
  interest_per_million: number;
}
export interface RecordMetadata {
  deleted_at?: string | null;
  updated_at?: string;
}
export interface Customer extends RecordMetadata {
  id: string;
  name: string;
  phone: string;
  address: string;
  apply_interest: boolean;
  created_at: string;
}
export interface Product extends RecordMetadata {
  id: string;
  name: string;
  price: number;
  created_at: string;
}
export interface Note extends RecordMetadata {
  id: string;
  customer_id: string;
  content: string;
  created_at: string;
}
export interface Item extends RecordMetadata {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
}
export interface Payment extends RecordMetadata {
  version?: number;
  id: string;
  order_id: string;
  amount: number;
  paid_on: string;
  kind: 'down_payment' | 'installment';
  note: string;
  created_at: string;
}
export interface Order extends RecordMetadata {
  version?: number;
  id: string;
  code: string;
  customer_id: string;
  ordered_on: string;
  total: number;
  apply_interest: boolean;
  interest_per_million: number;
  note: string;
  created_at: string;
  items: Item[];
  payments: Payment[];
}
export interface State {
  store: Store;
  customers: Customer[];
  products: Product[];
  notes: Note[];
  orders: Order[];
}
export interface LedgerEntry {
  payment_id?: string;
  date: string;
  type: 'interest' | 'payment';
  amount: number;
  principal: number;
  interest: number;
  label: string;
}
export type RecordType = 'customer' | 'product' | 'note' | 'order' | 'payment';
export interface TrashRecord {
  id: string;
  type: RecordType;
  label: string;
  detail: string;
  deleted_at: string;
  parent_deleted: boolean;
}
export interface Balance {
  principal: number;
  interest: number;
  total: number;
  paid: number;
  accrued: number;
  ledger: LedgerEntry[];
}
