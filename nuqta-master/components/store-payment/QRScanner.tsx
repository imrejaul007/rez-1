/**
 * QR Scanner Component
 *
 * Cross-platform QR code scanner for store payments.
 * - Native (iOS/Android): Uses expo-camera for real-time QR scanning
 * - Web: Provides manual code entry with optional webcam support
 *
 * The platform-specific implementations are in:
 * - QRScanner.native.tsx (iOS/Android)
 * - QRScanner.web.tsx (Web)
 *
 * Metro bundler automatically resolves the correct file based on platform.
 */

// Re-export from native by default (Metro will resolve correctly)
export { default } from './QRScanner.native';
