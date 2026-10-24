import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { StatementDto } from './dto/statement.dto.js';
import { SharingService } from './sharing.service.js';

@Controller('api/customers/:id/share')
@UseGuards(AuthGuard)
export class SharingOwnerController {
  constructor(@Inject(SharingService) private readonly sharing: SharingService) {}
  @Get() get(@Req() request: AuthRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sharing.get(request, id);
  }
  @Post() create(@Req() request: AuthRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sharing.create(request, id);
  }
  @Delete() revoke(@Req() request: AuthRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sharing.revoke(request, id);
  }
}
@Controller('api/public/statement')
export class SharedStatementController {
  constructor(@Inject(SharingService) private readonly sharing: SharingService) {}
  @Post()
  @HttpCode(200)
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @Header('Referrer-Policy', 'no-referrer')
  read(@ValidatedBody(StatementDto) body: StatementDto) {
    return this.sharing.statement(body.token);
  }
}
