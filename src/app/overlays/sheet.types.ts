import type { Customer, Note, Order, Payment, Product } from '../../../shared/types';

export type Sheet =
  | { type: 'customer'; customer?: Customer }
  | { type: 'product'; product?: Product }
  | { type: 'note'; customer: Customer; note?: Note }
  | { type: 'payment'; order: Order; payment?: Payment }
  | { type: 'order'; customer: Customer; order?: Order };
