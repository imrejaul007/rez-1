import { createServiceLogger, sanitizeLog } from '../../config/logger';

const authLogger = createServiceLogger('AuthService');

export class AuthLogger {
  static logLoginAttempt(email: string, method: string, ipAddress?: string, correlationId?: string) {
    authLogger.info('Login attempt', {
      email,
      method,
      ipAddress,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logLoginSuccess(userId: string, email: string, method: string, ipAddress?: string, correlationId?: string) {
    authLogger.info('Login successful', {
      userId,
      email,
      method,
      ipAddress,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logLoginFailure(email: string, reason: string, ipAddress?: string, correlationId?: string) {
    authLogger.warn('Login failed', {
      email,
      reason,
      ipAddress,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logInvalidCredentials(email: string, attemptCount: number, ipAddress?: string, correlationId?: string) {
    authLogger.warn('Invalid credentials', {
      email,
      attemptCount,
      ipAddress,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logAccountLocked(userId: string, email: string, reason: string, correlationId?: string) {
    authLogger.warn('Account locked', {
      userId,
      email,
      reason,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPasswordReset(userId: string, email: string, method: string, correlationId?: string) {
    authLogger.info('Password reset initiated', {
      userId,
      email,
      method,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPasswordResetSuccess(userId: string, email: string, correlationId?: string) {
    authLogger.info('Password reset successful', {
      userId,
      email,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logPasswordResetFailure(email: string, error: any, correlationId?: string) {
    authLogger.error('Password reset failed', error, {
      email,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRegistration(userId: string, email: string, registrationMethod: string, correlationId?: string) {
    authLogger.info('User registered', {
      userId,
      email,
      registrationMethod,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logRegistrationFailure(email: string, reason: string, error?: any, correlationId?: string) {
    authLogger.warn('Registration failed', {
      email,
      reason,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logLogout(userId: string, method: string, correlationId?: string) {
    authLogger.info('User logged out', {
      userId,
      method,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logTokenRefresh(userId: string, tokenType: string, correlationId?: string) {
    authLogger.debug('Token refreshed', {
      userId,
      tokenType,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logTokenExpiration(userId: string, tokenType: string, correlationId?: string) {
    authLogger.warn('Token expired', {
      userId,
      tokenType,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logMFASetup(userId: string, method: string, correlationId?: string) {
    authLogger.info('MFA setup initiated', {
      userId,
      method,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logMFAVerification(userId: string, method: string, success: boolean, correlationId?: string) {
    authLogger.info('MFA verification', {
      userId,
      method,
      success,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logSuspiciousActivity(userId: string, activity: string, details: any, correlationId?: string) {
    authLogger.warn('Suspicious activity detected', {
      userId,
      activity,
      details,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logSecurityBreach(severity: string, description: string, affectedUsers?: number, correlationId?: string) {
    authLogger.error('Security breach detected', null, {
      severity,
      description,
      affectedUsers,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOTPGeneration(userId: string, phoneNumber: string, correlationId?: string) {
    authLogger.info('OTP generated', {
      userId,
      phoneNumber: phoneNumber.replace(/\d(?=\d{2})/g, '*'),
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logOTPVerification(userId: string, success: boolean, correlationId?: string) {
    authLogger.info('OTP verification', {
      userId,
      success,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logAPIKeyGeneration(userId: string, keyName: string, correlationId?: string) {
    authLogger.info('API key generated', {
      userId,
      keyName,
      timestamp: new Date().toISOString()
    }, correlationId);
  }

  static logAPIKeyRevocation(userId: string, keyId: string, correlationId?: string) {
    authLogger.info('API key revoked', {
      userId,
      keyId,
      timestamp: new Date().toISOString()
    }, correlationId);
  }
}
