import { create } from 'zustand';
import { SocketState } from '@/types/socket.types';

// ---------------------------------------------------------------------------
// Store holds ONLY connection state — the socket instance stays in Provider
// ---------------------------------------------------------------------------
interface SocketStoreState {
  state: SocketState;
  isConnected: boolean;
  lastEvent: string | null;
  _setFromProvider: (state: SocketState) => void;
  _setLastEvent: (event: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useSocketStore = create<SocketStoreState>((set) => ({
  state: {
    connected: false,
    reconnecting: false,
    error: null,
    lastConnected: null,
    reconnectAttempts: 0,
  },
  isConnected: false,
  lastEvent: null,

  // FIX: Skip update if nothing changed to prevent render loop (React Error #185)
  _setFromProvider: (state: SocketState) => {
    set((s) => {
      if (s.state === state) return {};
      return { state, isConnected: state.connected };
    });
  },

  _setLastEvent: (event: string) => {
    set({ lastEvent: event });
  },
}));
