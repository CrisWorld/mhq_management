import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SharingOwnerController, SharedStatementController } from './sharing.controller.js';
import { SharingService } from './sharing.service.js';
@Module({
  imports: [AuthModule],
  controllers: [SharingOwnerController, SharedStatementController],
  providers: [SharingService],
})
export class SharingModule {}
