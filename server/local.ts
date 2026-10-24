import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
const { createApp } = await import('./app');
const app = await createApp();
app.listen(3001, '0.0.0.0', () => console.log('NestJS API http://localhost:3001'));
