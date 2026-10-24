import { Controller, Inject, Patch, Req, UseGuards } from '@nestjs/common';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { SettingsService } from './settings.service.js';
import { SettingsDto } from './dto/settings.dto.js';
@Controller('api/settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settings: SettingsService) {}
  @Patch() update(@Req() request: AuthRequest, @ValidatedBody(SettingsDto) dto: SettingsDto) {
    return this.settings.update(request, dto);
  }
}
