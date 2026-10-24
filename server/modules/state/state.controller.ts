import { Controller, Get, Inject, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { StateService } from './state.service.js';
@Controller('api/state')
@UseGuards(AuthGuard)
export class StateController {
  constructor(@Inject(StateService) private readonly state: StateService) {}
  @Get() get(@Req() request: AuthRequest) {
    return this.state.get(request);
  }
}
