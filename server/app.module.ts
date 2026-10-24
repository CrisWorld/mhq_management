import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { StateModule } from './modules/state/state.module.js';
import { TrashModule } from './modules/trash/trash.module.js';
@Module({
  imports: [
    HealthModule,
    CustomersModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    SettingsModule,
    StateModule,
    TrashModule,
  ],
})
export class AppModule {}
