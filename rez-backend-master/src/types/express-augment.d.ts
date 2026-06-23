import {} from 'mongoose';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      user?: IUser;
      userId?: string;
      correlationId?: string;
      // BUG-051 FIX: Add userRole to avoid (req as any).userRole casts
      userRole?: string;
      /** Raw request body buffer — set by body-parser rawBody middleware */
      rawBody?: Buffer | string;
    }
  }

  // Global services
  var CrossAppSyncService: any;
  var io: any;
  var realTimeService: any;
}

export {};
