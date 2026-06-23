declare module 'uuid';
declare module 'qrcode';

// Node.js crypto global extension (not in standard Web Crypto API)
interface NodeCrypto {
  randomInt(min: number, max: number): number;
  randomUUID(options?: { disableEntropyCache?: boolean }): string;
}
declare global {
  interface Crypto {
    randomInt(min: number, max: number): number;
    randomUUID(options?: { disableEntropyCache?: boolean }): string;
  }
}
export {};
