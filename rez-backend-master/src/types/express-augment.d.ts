import {} from 'mongoose';
import { IUser } from '../models/User';

/** Raw request body buffer — set by body-parser rawBody middleware */
export interface RawBodyRequest {
  rawBody?: Buffer | string;
}

/** Device risk information from fingerprint service */
export interface DeviceRiskRequest {
  deviceRisk?: 'low' | 'medium' | 'high' | 'critical';
  deviceHash?: string;
}

declare global {
  namespace Express {
    interface Request extends RawBodyRequest, DeviceRiskRequest {
      merchantId?: string;
      user?: IUser;
      userId?: string;
      correlationId?: string;
      /** BUG-051 FIX: Add userRole to avoid (req as any).userRole casts */
      userRole?: string;
    }
  }

  // Global services - properly typed interfaces

  /** Cross-app synchronization service for multi-instance deployments */
  interface ICrossAppSyncService {
    publish(channel: string, data: unknown): Promise<void>;
    subscribe(channel: string, handler: (data: unknown) => void): Promise<void>;
    invalidateCache(pattern: string): Promise<void>;
  }

  /** Socket.IO instance for real-time communication */
  interface IIOServer {
    to(room: string): { emit: (event: string, data: unknown) => void };
    emit(event: string, data: unknown): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  /** Real-time service for WebSocket/SSE connections */
  interface IRealTimeService {
    sendToUser(userId: string, event: string, data: unknown): Promise<void>;
    sendToRoom(room: string, event: string, data: unknown): Promise<void>;
    broadcast(event: string, data: unknown): void;
  }

  var CrossAppSyncService: ICrossAppSyncService;
  var io: IIOServer;
  var realTimeService: IRealTimeService;
}

export {};
