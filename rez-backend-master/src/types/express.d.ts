import { Types } from 'mongoose';
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      user?: IUser;
      userId?: string;
      correlationId?: string;
    }
  }

  // Global services
  var CrossAppSyncService: any;
  var io: any;
  var realTimeService: any;
}

export {};
