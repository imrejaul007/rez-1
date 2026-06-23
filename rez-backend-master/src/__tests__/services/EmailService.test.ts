import EmailService from '../../services/EmailService';
import sgMail from '@sendgrid/mail';

// Mock SendGrid
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
}));

describe('EmailService', () => {
  const originalSendGridKey = process.env.SENDGRID_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalSendGridKey) {
      process.env.SENDGRID_API_KEY = originalSendGridKey;
    }
  });

  describe('send', () => {
    it('should send email successfully when SendGrid is configured', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test email body',
        html: '<p>Test email body</p>'
      };

      await EmailService.send(options);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Email',
          text: 'Test email body',
          html: '<p>Test email body</p>'
        })
      );
    });

    it('should log to console when SendGrid is not configured', async () => {
      delete (process.env as any).SENDGRID_API_KEY;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test email body'
      };

      await EmailService.send(options);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('EMAIL (SendGrid not configured')
      );
      expect(sgMail.send).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle email sending errors', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';
      (sgMail.send as jest.Mock).mockRejectedValueOnce(
        new Error('SendGrid API error')
      );

      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test email body'
      };

      await expect(EmailService.send(options)).rejects.toThrow(
        'Failed to send email'
      );
    });

    it('should support multiple recipients', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      const options = {
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        text: 'Test email body'
      };

      await EmailService.send(options);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['test1@example.com', 'test2@example.com']
        })
      );
    });

    it('should use default FROM email if not provided', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';
      process.env.SENDGRID_FROM_EMAIL = 'noreply@test.com';

      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'Test email body'
      };

      await EmailService.send(options);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.objectContaining({
            email: 'noreply@test.com'
          })
        })
      );
    });
  });

  describe('sendPasswordChangeConfirmation', () => {
    it('should send password change confirmation email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      await EmailService.sendPasswordChangeConfirmation(
        'merchant@test.com',
        'Test Merchant'
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'merchant@test.com',
          subject: expect.stringContaining('Password Changed')
        })
      );
    });

    it('should include merchant name in email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      await EmailService.sendPasswordChangeConfirmation(
        'merchant@test.com',
        'Test Merchant'
      );

      const callArgs = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('Test Merchant');
    });
  });

  describe('sendRefundConfirmation', () => {
    it('should send refund confirmation email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      const refundDetails = {
        orderNumber: 'ORD-123',
        refundAmount: 100.50,
        refundType: 'full' as const,
        refundMethod: 'wallet',
        estimatedArrival: '3-5 business days',
        refundId: 'RFND-123'
      };

      await EmailService.sendRefundConfirmation(
        'customer@test.com',
        'Test Customer',
        refundDetails
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@test.com',
          subject: expect.stringContaining('Refund')
        })
      );
    });

    it('should include refund details in email', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      const refundDetails = {
        orderNumber: 'ORD-123',
        refundAmount: 100.50,
        refundType: 'partial' as const,
        refundMethod: 'razorpay',
        estimatedArrival: '5-7 business days',
        refundId: 'RFND-123',
        reason: 'Customer request'
      };

      await EmailService.sendRefundConfirmation(
        'customer@test.com',
        'Test Customer',
        refundDetails
      );

      const callArgs = (sgMail.send as jest.Mock).mock.calls[0][0];
      expect(callArgs.html).toContain('ORD-123');
      expect(callArgs.html).toContain('100.50');
      expect(callArgs.html).toContain('RFND-123');
      expect(callArgs.html).toContain('Customer request');
    });
  });

  describe('sendOnboardingSubmitted', () => {
    it('should send onboarding submission confirmation', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      await EmailService.sendOnboardingSubmitted(
        'merchant@test.com',
        'Test Merchant'
      );

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'merchant@test.com',
          subject: expect.stringContaining('Onboarding')
        })
      );
    });
  });

  describe('Template emails', () => {
    it('should support dynamic template data', async () => {
      process.env.SENDGRID_API_KEY = 'SG.test_key_123456789';

      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        templateId: 'd-template-123',
        dynamicTemplateData: {
          name: 'Test User',
          amount: 100
        }
      };

      await EmailService.send(options);

      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'd-template-123',
          dynamicTemplateData: {
            name: 'Test User',
            amount: 100
          }
        })
      );
    });
  });
});

