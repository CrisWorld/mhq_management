import type { Request, Response } from 'express';
import { createApp } from '../server/app.js';
export default async function handler(req:Request,res:Response){const app=await createApp();return app(req,res);}
