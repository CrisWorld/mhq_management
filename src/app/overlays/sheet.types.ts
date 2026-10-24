import type { Customer, Order, Product } from '../../../shared/types';

export type Sheet =
  | { type: 'customer'; customer?: Customer }
  | { type: 'product'; product?: Product }
  | { type: 'note'; customer: Customer }
  | { type: 'payment'; order: Order }
  | { type: 'order'; customer: Customer };
