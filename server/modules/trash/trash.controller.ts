import { Controller, Get, Inject, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { TrashService } from './trash.service.js';

@Controller('api/trash')
@UseGuards(AuthGuard)
export class TrashController {
  constructor(@Inject(TrashService) private readonly trash: TrashService) {}
  @Get() list(@Req() request: AuthRequest) {
    return this.trash.list(request);
  }
  @Patch(':type/:id/restore') restore(
    @Req() request: AuthRequest,
    @Param('type') type: string,
    @Param('id') id: string,
  ) {
    return this.trash.restore(request, type, id);
  }
}
