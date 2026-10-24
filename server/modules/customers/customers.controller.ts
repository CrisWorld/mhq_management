import { Controller, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ValidatedBody } from '../../common/validation/validated-body.decorator.js';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthRequest } from '../auth/auth-request.type.js';
import { CustomersService } from './customers.service.js';
import { CustomerDto } from './dto/customer.dto.js';
import { NoteDto } from './dto/note.dto.js';
@Controller('api/customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}
  @Post() create(@Req() request: AuthRequest, @ValidatedBody(CustomerDto) dto: CustomerDto) {
    return this.customers.create(request, dto);
  }
  @Patch(':id') update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @ValidatedBody(CustomerDto) dto: CustomerDto,
  ) {
    return this.customers.update(request, id, dto);
  }
  @Post(':id/notes') addNote(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @ValidatedBody(NoteDto) dto: NoteDto,
  ) {
    return this.customers.addNote(request, id, dto);
  }
}
