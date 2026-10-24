import { Body, ValidationPipe, type Type } from '@nestjs/common';
// Supply the DTO explicitly because tsx/serverless transpilers may omit design:paramtypes.
export function ValidatedBody(dto: Type<unknown>) {
  return Body(
    new ValidationPipe({
      expectedType: dto,
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
