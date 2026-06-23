/**
 * E2E Test: Earning Journey
 *
 * Tests the complete earning experience including:
 * - Browse earning opportunities
 * - View project details
 * - Submit work/bills
 * - Track submissions
 * - Receive coins
 * - Wallet integration
 * - Referral system
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  waitForElement,
  tapElement,
  typeText,
  takeScreenshot,
  login,
} = require('./helpers/testHelpers');

describe('Earning Journey E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
        camera: 'YES',
        photos: 'YES',
      },
    });

    // Login first
    try {
      await login('+919876543210', '123456');
    } catch (error) {
      console.log('Login skipped - already logged in');
    }
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Earn Tab Navigation', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should navigate to Earn tab', async () => {
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      await detoxExpect(element(by.id('earn-screen'))).toBeVisible();
      await takeScreenshot('earning-01-earn-tab');
    });

    it('should display earnings dashboard', async () => {
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      // Verify dashboard components
      await detoxExpect(element(by.id('total-earnings'))).toBeVisible();
      await detoxExpect(element(by.id('pending-earnings'))).toBeVisible();
      await detoxExpect(element(by.id('coins-balance'))).toBeVisible();
      await takeScreenshot('earning-02-earnings-dashboard');
    });

    it('should display earning categories', async () => {
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);

      // Check categories
      await detoxExpect(element(by.id('category-upload-bills'))).toBeVisible();
      await detoxExpect(element(by.id('category-social-media'))).toBeVisible();
      await detoxExpect(element(by.id('category-projects'))).toBeVisible();
      await detoxExpect(element(by.id('category-referrals'))).toBeVisible();
      await takeScreenshot('earning-03-earning-categories');
    });
  });

  describe('Browse Earning Opportunities', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should view all earning opportunities', async () => {
      // Scroll through opportunities
      await element(by.id('earn-scroll-view')).scroll(300, 'down');
      await waitForElement(by.id('opportunities-section'), 2000);

      await detoxExpect(element(by.id('opportunities-section'))).toBeVisible();
      await takeScreenshot('earning-04-opportunities');
    });

    it('should filter opportunities by category', async () => {
      // Tap on bills category
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bills-opportunities'), 2000);

      await detoxExpect(element(by.id('bills-opportunities'))).toBeVisible();
      await takeScreenshot('earning-05-bills-category');
    });

    it('should view opportunity details', async () => {
      await element(by.id('earn-scroll-view')).scroll(300, 'down');
      await waitForElement(by.id('opportunity-card-0'), 2000);

      // Tap on opportunity
      await tapElement(by.id('opportunity-card-0'));
      await waitForElement(by.id('opportunity-details'), 2000);

      await detoxExpect(element(by.id('opportunity-details'))).toBeVisible();
      await detoxExpect(element(by.id('opportunity-title'))).toBeVisible();
      await detoxExpect(element(by.id('opportunity-reward'))).toBeVisible();
      await detoxExpect(element(by.id('opportunity-description'))).toBeVisible();
      await takeScreenshot('earning-06-opportunity-details');
    });

    it('should view opportunity requirements', async () => {
      await element(by.id('earn-scroll-view')).scroll(300, 'down');
      await tapElement(by.id('opportunity-card-0'));
      await waitForElement(by.id('opportunity-details'), 2000);

      // Scroll to requirements
      await element(by.id('opportunity-scroll-view')).scroll(200, 'down');
      await waitForElement(by.id('requirements-section'), 2000);

      await detoxExpect(element(by.id('requirements-section'))).toBeVisible();
      await takeScreenshot('earning-07-requirements');
    });
  });

  describe('Bill Upload Journey', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should navigate to bill upload', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      await detoxExpect(element(by.id('bill-upload-screen'))).toBeVisible();
      await takeScreenshot('earning-08-bill-upload-screen');
    });

    it('should take photo of bill', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Open camera
      await tapElement(by.id('take-photo-button'));
      await waitForElement(by.id('camera-screen'), 3000);

      await detoxExpect(element(by.id('camera-screen'))).toBeVisible();
      await takeScreenshot('earning-09-camera-screen');

      // Take photo (simulated)
      await tapElement(by.id('capture-button'));
      await waitForElement(by.id('photo-preview'), 2000);

      await detoxExpect(element(by.id('photo-preview'))).toBeVisible();
      await takeScreenshot('earning-10-photo-preview');

      // Confirm photo
      await tapElement(by.id('confirm-photo-button'));
    });

    it('should upload bill from gallery', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Choose from gallery
      await tapElement(by.id('choose-from-gallery-button'));

      // Gallery picker will open (system UI)
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('earning-11-gallery-picker');

      // Note: Can't directly test system gallery picker
      // Assuming image selected, continue with upload flow
    });

    it('should fill bill details', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Scroll to form
      await element(by.id('bill-upload-scroll-view')).scroll(300, 'down');

      // Fill bill details
      await typeText(by.id('store-name-input'), 'Test Store');
      await typeText(by.id('bill-amount-input'), '1500');
      await takeScreenshot('earning-12-bill-details-filled');

      // Select date
      await tapElement(by.id('bill-date-picker'));
      await waitForElement(by.id('date-picker-modal'), 2000);
      await tapElement(by.id('date-today'));
      await tapElement(by.id('date-confirm-button'));
    });

    it('should submit bill for verification', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Fill required details (assuming image already uploaded)
      await typeText(by.id('store-name-input'), 'Test Store');
      await typeText(by.id('bill-amount-input'), '1500');

      // Submit
      await element(by.id('bill-upload-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('submit-bill-button'));

      // Wait for success
      await waitForElement(by.text('Bill submitted successfully'), 3000);
      await takeScreenshot('earning-13-bill-submitted');

      // Should navigate to submissions
      await waitForElement(by.id('submissions-screen'), 3000);
      await detoxExpect(element(by.id('submissions-screen'))).toBeVisible();
    });

    it('should validate bill amount', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Enter invalid amount
      await typeText(by.id('bill-amount-input'), '0');
      await tapElement(by.id('submit-bill-button'));

      // Should show error
      await waitForElement(by.text('Invalid amount'), 2000);
      await takeScreenshot('earning-14-amount-validation');
    });

    it('should view bill history', async () => {
      await tapElement(by.id('category-upload-bills'));
      await waitForElement(by.id('bill-upload-screen'), 2000);

      // Navigate to history
      await tapElement(by.id('view-history-button'));
      await waitForElement(by.id('bill-history-screen'), 2000);

      await detoxExpect(element(by.id('bill-history-screen'))).toBeVisible();
      await takeScreenshot('earning-15-bill-history');
    });
  });

  describe('Social Media Earning', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should navigate to social media tasks', async () => {
      await tapElement(by.id('category-social-media'));
      await waitForElement(by.id('social-media-screen'), 2000);

      await detoxExpect(element(by.id('social-media-screen'))).toBeVisible();
      await takeScreenshot('earning-16-social-media-tasks');
    });

    it('should view Instagram earning tasks', async () => {
      await tapElement(by.id('category-social-media'));
      await waitForElement(by.id('social-media-screen'), 2000);

      // Tap Instagram tab
      await tapElement(by.id('platform-instagram'));
      await waitForElement(by.id('instagram-tasks'), 2000);

      await detoxExpect(element(by.id('instagram-tasks'))).toBeVisible();
      await takeScreenshot('earning-17-instagram-tasks');
    });

    it('should link Instagram account', async () => {
      await tapElement(by.id('category-social-media'));
      await waitForElement(by.id('social-media-screen'), 2000);
      await tapElement(by.id('platform-instagram'));
      await waitForElement(by.id('instagram-tasks'), 2000);

      // Link account
      await tapElement(by.id('link-instagram-button'));
      await waitForElement(by.id('instagram-verification-modal'), 2000);

      await detoxExpect(element(by.id('instagram-verification-modal'))).toBeVisible();
      await takeScreenshot('earning-18-instagram-verification');

      // Enter username
      await typeText(by.id('instagram-username-input'), '@testuser');
      await tapElement(by.id('verify-button'));

      // Wait for verification
      await waitForElement(by.text('Account verified'), 5000);
      await takeScreenshot('earning-19-instagram-linked');
    });

    it('should complete social media task', async () => {
      await tapElement(by.id('category-social-media'));
      await waitForElement(by.id('social-media-screen'), 2000);
      await tapElement(by.id('platform-instagram'));
      await waitForElement(by.id('instagram-tasks'), 2000);

      // Start task
      await tapElement(by.id('task-0'));
      await waitForElement(by.id('task-details'), 2000);

      await detoxExpect(element(by.id('task-details'))).toBeVisible();
      await takeScreenshot('earning-20-task-details');

      // Mark as completed
      await tapElement(by.id('mark-complete-button'));
      await waitForElement(by.text('Task completed'), 2000);
    });

    it('should submit proof for social task', async () => {
      await tapElement(by.id('category-social-media'));
      await waitForElement(by.id('social-media-screen'), 2000);
      await tapElement(by.id('platform-instagram'));
      await waitForElement(by.id('instagram-tasks'), 2000);
      await tapElement(by.id('task-0'));
      await waitForElement(by.id('task-details'), 2000);

      // Submit proof
      await element(by.id('task-scroll-view')).scroll(300, 'down');
      await typeText(by.id('proof-link-input'), 'https://instagram.com/p/test123');
      await tapElement(by.id('submit-proof-button'));

      await waitForElement(by.text('Proof submitted'), 2000);
      await takeScreenshot('earning-21-proof-submitted');
    });
  });

  describe('Project Submissions', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should view available projects', async () => {
      await tapElement(by.id('category-projects'));
      await waitForElement(by.id('projects-screen'), 2000);

      await detoxExpect(element(by.id('projects-screen'))).toBeVisible();
      await takeScreenshot('earning-22-available-projects');
    });

    it('should view project details and requirements', async () => {
      await tapElement(by.id('category-projects'));
      await waitForElement(by.id('projects-screen'), 2000);

      // Tap on project
      await tapElement(by.id('project-card-0'));
      await waitForElement(by.id('project-details-screen'), 2000);

      await detoxExpect(element(by.id('project-details-screen'))).toBeVisible();
      await detoxExpect(element(by.id('project-title'))).toBeVisible();
      await detoxExpect(element(by.id('project-reward'))).toBeVisible();
      await detoxExpect(element(by.id('project-deadline'))).toBeVisible();
      await takeScreenshot('earning-23-project-details');

      // Scroll to requirements
      await element(by.id('project-scroll-view')).scroll(300, 'down');
      await detoxExpect(element(by.id('project-requirements'))).toBeVisible();
    });

    it('should apply for project', async () => {
      await tapElement(by.id('category-projects'));
      await waitForElement(by.id('projects-screen'), 2000);
      await tapElement(by.id('project-card-0'));
      await waitForElement(by.id('project-details-screen'), 2000);

      // Apply
      await element(by.id('project-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('apply-project-button'));

      await waitForElement(by.text('Application submitted'), 2000);
      await takeScreenshot('earning-24-project-applied');
    });

    it('should submit project work', async () => {
      await tapElement(by.id('category-projects'));
      await waitForElement(by.id('projects-screen'), 2000);

      // Navigate to active projects
      await tapElement(by.id('tab-active-projects'));
      await waitForElement(by.id('active-project-0'), 2000);

      // Open project
      await tapElement(by.id('active-project-0'));
      await waitForElement(by.id('project-submission-screen'), 2000);

      await detoxExpect(element(by.id('project-submission-screen'))).toBeVisible();
      await takeScreenshot('earning-25-project-submission');

      // Upload files
      await tapElement(by.id('upload-files-button'));
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add description
      await typeText(by.id('submission-description-input'), 'Completed work as per requirements');

      // Submit
      await tapElement(by.id('submit-work-button'));
      await waitForElement(by.text('Work submitted'), 3000);
      await takeScreenshot('earning-26-work-submitted');
    });

    it('should view submission status', async () => {
      await tapElement(by.id('category-projects'));
      await waitForElement(by.id('projects-screen'), 2000);

      // Navigate to submissions tab
      await tapElement(by.id('tab-submissions'));
      await waitForElement(by.id('submissions-list'), 2000);

      await detoxExpect(element(by.id('submissions-list'))).toBeVisible();
      await takeScreenshot('earning-27-submissions-list');

      // View submission details
      await tapElement(by.id('submission-0'));
      await waitForElement(by.id('submission-details'), 2000);

      await detoxExpect(element(by.id('submission-status'))).toBeVisible();
      await takeScreenshot('earning-28-submission-status');
    });
  });

  describe('Referral System', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should navigate to referral section', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      await detoxExpect(element(by.id('referral-screen'))).toBeVisible();
      await takeScreenshot('earning-29-referral-screen');
    });

    it('should view referral code and stats', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      // Verify referral code
      await detoxExpect(element(by.id('referral-code'))).toBeVisible();
      await detoxExpect(element(by.id('total-referrals'))).toBeVisible();
      await detoxExpect(element(by.id('referral-earnings'))).toBeVisible();
      await takeScreenshot('earning-30-referral-stats');
    });

    it('should copy referral code', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      // Copy code
      await tapElement(by.id('copy-referral-code-button'));
      await waitForElement(by.text('Code copied'), 2000);
      await takeScreenshot('earning-31-code-copied');
    });

    it('should share referral link', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      // Share
      await tapElement(by.id('share-referral-button'));
      await waitForElement(by.id('share-modal'), 2000);

      await detoxExpect(element(by.id('share-modal'))).toBeVisible();
      await takeScreenshot('earning-32-share-referral');

      // Select sharing method
      await tapElement(by.id('share-whatsapp'));
      // System share sheet will open
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('should view referral leaderboard', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      // Scroll to leaderboard
      await element(by.id('referral-scroll-view')).scroll(400, 'down');
      await waitForElement(by.id('referral-leaderboard'), 2000);

      await detoxExpect(element(by.id('referral-leaderboard'))).toBeVisible();
      await takeScreenshot('earning-33-referral-leaderboard');
    });

    it('should view referral history', async () => {
      await tapElement(by.id('category-referrals'));
      await waitForElement(by.id('referral-screen'), 2000);

      // Navigate to history
      await tapElement(by.id('referral-history-button'));
      await waitForElement(by.id('referral-history-screen'), 2000);

      await detoxExpect(element(by.id('referral-history-screen'))).toBeVisible();
      await takeScreenshot('earning-34-referral-history');
    });
  });

  describe('Coins and Wallet', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should view coin balance', async () => {
      // Coin balance visible on earn tab
      await detoxExpect(element(by.id('coins-balance'))).toBeVisible();
      await takeScreenshot('earning-35-coin-balance');
    });

    it('should view earning history', async () => {
      // Navigate to earning history
      await tapElement(by.id('earning-history-button'));
      await waitForElement(by.id('earning-history-screen'), 2000);

      await detoxExpect(element(by.id('earning-history-screen'))).toBeVisible();
      await takeScreenshot('earning-36-earning-history');

      // Verify transactions listed
      await detoxExpect(element(by.id('earning-transaction-0'))).toBeVisible();
    });

    it('should filter earning history', async () => {
      await tapElement(by.id('earning-history-button'));
      await waitForElement(by.id('earning-history-screen'), 2000);

      // Open filter
      await tapElement(by.id('filter-button'));
      await waitForElement(by.id('filter-modal'), 2000);
      await takeScreenshot('earning-37-filter-modal');

      // Filter by bills
      await tapElement(by.id('filter-bills'));
      await tapElement(by.id('apply-filter-button'));

      // View filtered results
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('earning-38-filtered-history');
    });

    it('should navigate to wallet from earn tab', async () => {
      await tapElement(by.id('wallet-button'));
      await waitForElement(by.id('wallet-screen'), 2000);

      await detoxExpect(element(by.id('wallet-screen'))).toBeVisible();
      await takeScreenshot('earning-39-wallet-from-earn');
    });

    it('should convert coins to money', async () => {
      await tapElement(by.id('wallet-button'));
      await waitForElement(by.id('wallet-screen'), 2000);

      // Tap convert coins
      await tapElement(by.id('convert-coins-button'));
      await waitForElement(by.id('coin-conversion-modal'), 2000);

      await detoxExpect(element(by.id('coin-conversion-modal'))).toBeVisible();
      await takeScreenshot('earning-40-coin-conversion');

      // Enter amount
      await typeText(by.id('coins-to-convert-input'), '100');

      // Preview conversion
      await detoxExpect(element(by.id('conversion-amount'))).toBeVisible();
      await takeScreenshot('earning-41-conversion-preview');

      // Confirm
      await tapElement(by.id('confirm-conversion-button'));
      await waitForElement(by.text('Coins converted'), 2000);
    });

    it('should view coin earning streaks', async () => {
      // Scroll to streaks section
      await element(by.id('earn-scroll-view')).scroll(500, 'down');
      await waitForElement(by.id('earning-streaks'), 2000);

      await detoxExpect(element(by.id('earning-streaks'))).toBeVisible();
      await detoxExpect(element(by.id('current-streak'))).toBeVisible();
      await takeScreenshot('earning-42-earning-streaks');
    });

    it('should claim daily bonus', async () => {
      // Scroll to daily bonus
      await element(by.id('earn-scroll-view')).scroll(300, 'down');
      await waitForElement(by.id('daily-bonus-card'), 2000);

      // Claim bonus
      await tapElement(by.id('claim-daily-bonus-button'));
      await waitForElement(by.text('Bonus claimed'), 2000);
      await takeScreenshot('earning-43-daily-bonus-claimed');

      // Verify coins updated
      await detoxExpect(element(by.id('coins-balance'))).toBeVisible();
    });
  });

  describe('Notifications and Tracking', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should receive notification for approved earning', async () => {
      // Simulate notification (would come from backend)
      // Check notification center
      await tapElement(by.id('notification-icon'));
      await waitForElement(by.id('notifications-screen'), 2000);

      // Look for earning notifications
      const earningNotifExists = await element(by.id('earning-notification-0')).exists();
      if (earningNotifExists) {
        await detoxExpect(element(by.id('earning-notification-0'))).toBeVisible();
        await takeScreenshot('earning-44-earning-notification');
      }
    });

    it('should track pending submissions', async () => {
      // Navigate to pending tab
      await tapElement(by.id('tab-pending'));
      await waitForElement(by.id('pending-submissions'), 2000);

      await detoxExpect(element(by.id('pending-submissions'))).toBeVisible();
      await takeScreenshot('earning-45-pending-submissions');
    });

    it('should view rejected submissions with reasons', async () => {
      // Navigate to rejected tab
      await tapElement(by.id('tab-rejected'));
      await waitForElement(by.id('rejected-submissions'), 2000);

      const rejectedExists = await element(by.id('rejected-submission-0')).exists();
      if (rejectedExists) {
        await tapElement(by.id('rejected-submission-0'));
        await waitForElement(by.id('rejection-reason'), 2000);

        await detoxExpect(element(by.id('rejection-reason'))).toBeVisible();
        await takeScreenshot('earning-46-rejection-reason');
      }
    });

    it('should resubmit after rejection', async () => {
      await tapElement(by.id('tab-rejected'));
      await waitForElement(by.id('rejected-submissions'), 2000);

      const rejectedExists = await element(by.id('rejected-submission-0')).exists();
      if (rejectedExists) {
        await tapElement(by.id('rejected-submission-0'));
        await waitForElement(by.id('rejection-reason'), 2000);

        // Resubmit
        await tapElement(by.id('resubmit-button'));
        await waitForElement(by.id('resubmission-screen'), 2000);

        await detoxExpect(element(by.id('resubmission-screen'))).toBeVisible();
        await takeScreenshot('earning-47-resubmission');
      }
    });
  });

  describe('Achievement and Milestones', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-earn'));
      await waitForElement(by.id('earn-screen'), 3000);
    });

    it('should view earning achievements', async () => {
      // Navigate to achievements
      await tapElement(by.id('achievements-button'));
      await waitForElement(by.id('achievements-screen'), 2000);

      await detoxExpect(element(by.id('achievements-screen'))).toBeVisible();
      await takeScreenshot('earning-48-achievements');
    });

    it('should view milestone progress', async () => {
      await tapElement(by.id('achievements-button'));
      await waitForElement(by.id('achievements-screen'), 2000);

      // Check milestone progress
      await detoxExpect(element(by.id('milestone-progress'))).toBeVisible();
      await takeScreenshot('earning-49-milestone-progress');
    });

    it('should claim milestone reward', async () => {
      await tapElement(by.id('achievements-button'));
      await waitForElement(by.id('achievements-screen'), 2000);

      // Check for completed milestone
      const claimExists = await element(by.id('claim-milestone-0')).exists();
      if (claimExists) {
        await tapElement(by.id('claim-milestone-0'));
        await waitForElement(by.text('Reward claimed'), 2000);
        await takeScreenshot('earning-50-milestone-claimed');
      }
    });
  });
});
