import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module.js';
let appPromise: Promise<express.Express> | undefined;
export function createApp() {
  return (appPromise ??= (async () => {
    const instance = express();
    instance.disable('x-powered-by');
    instance.use(express.json({ limit: '64kb' }));
    instance.use('/api', (_request, response, next) => {
      response.setHeader('Cache-Control', 'no-store');
      next();
    });
    const app = await NestFactory.create(AppModule, new ExpressAdapter(instance), {
      logger: ['error', 'warn'],
    });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    return instance;
  })().catch((error) => {
    appPromise = undefined;
    throw error;
  }));
}
