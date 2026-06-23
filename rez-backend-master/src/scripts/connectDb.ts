import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config();

export async function connectScriptDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required. Set it in .env or pass it directly.');
  }
  await mongoose.connect(uri);
  logger.info('Connected to database');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
