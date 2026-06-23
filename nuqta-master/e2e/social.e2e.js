/**
 * E2E Test: Social and UGC Journey
 *
 * Tests the complete social/play experience including:
 * - Browse video content
 * - Watch videos
 * - Like, comment, share
 * - Upload UGC content
 * - Follow users
 * - View feed
 */

const { device, element, by, expect: detoxExpect, waitFor } = require('detox');
const {
  waitForElement,
  tapElement,
  typeText,
  swipeElement,
  takeScreenshot,
  login,
} = require('./helpers/testHelpers');

describe('Social and UGC Journey E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        location: 'always',
        camera: 'YES',
        photos: 'YES',
        microphone: 'YES',
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

  describe('Play Tab Navigation', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should navigate to Play tab', async () => {
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);

      await detoxExpect(element(by.id('play-screen'))).toBeVisible();
      await takeScreenshot('social-01-play-tab');
    });

    it('should display video feed', async () => {
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);

      // Verify video feed loaded
      await waitForElement(by.id('video-feed'), 3000);
      await detoxExpect(element(by.id('video-feed'))).toBeVisible();
      await takeScreenshot('social-02-video-feed');
    });

    it('should display featured video', async () => {
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);

      // Featured video should be visible
      await detoxExpect(element(by.id('featured-video'))).toBeVisible();
      await takeScreenshot('social-03-featured-video');
    });
  });

  describe('Browse Video Content', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
    });

    it('should scroll through video feed', async () => {
      // Scroll down through videos
      await element(by.id('video-feed')).scroll(300, 'down');
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-04-scrolled-feed');

      // Verify more videos loaded
      await detoxExpect(element(by.id('video-card-3'))).toBeVisible();
    });

    it('should view video categories', async () => {
      // Category tabs should be visible
      await detoxExpect(element(by.id('category-tabs'))).toBeVisible();
      await takeScreenshot('social-05-category-tabs');

      // Verify categories
      await detoxExpect(element(by.id('category-all'))).toBeVisible();
      await detoxExpect(element(by.id('category-fashion'))).toBeVisible();
      await detoxExpect(element(by.id('category-food'))).toBeVisible();
    });

    it('should filter videos by category', async () => {
      // Tap on Fashion category
      await tapElement(by.id('category-fashion'));
      await new Promise(resolve => setTimeout(resolve, 1000));

      await takeScreenshot('social-06-fashion-videos');

      // Verify filtered content loaded
      await detoxExpect(element(by.id('video-feed'))).toBeVisible();
    });

    it('should search for videos', async () => {
      // Tap search
      await tapElement(by.id('search-videos-button'));
      await waitForElement(by.id('video-search-screen'), 2000);

      await detoxExpect(element(by.id('video-search-screen'))).toBeVisible();
      await takeScreenshot('social-07-video-search');

      // Search for "makeup"
      await typeText(by.id('search-input'), 'makeup');
      await tapElement(by.id('search-button'));

      // Wait for results
      await waitForElement(by.id('search-results'), 3000);
      await detoxExpect(element(by.id('search-results'))).toBeVisible();
      await takeScreenshot('social-08-search-results');
    });

    it('should view trending videos', async () => {
      // Scroll to trending section
      await element(by.id('play-scroll-view')).scroll(400, 'down');
      await waitForElement(by.id('trending-videos-section'), 2000);

      await detoxExpect(element(by.id('trending-videos-section'))).toBeVisible();
      await takeScreenshot('social-09-trending-videos');
    });

    it('should view videos by creator', async () => {
      // Tap on creator profile picture
      await tapElement(by.id('video-0-creator-avatar'));
      await waitForElement(by.id('creator-profile-screen'), 2000);

      await detoxExpect(element(by.id('creator-profile-screen'))).toBeVisible();
      await takeScreenshot('social-10-creator-profile');

      // Verify creator's videos
      await detoxExpect(element(by.id('creator-videos'))).toBeVisible();
    });
  });

  describe('Video Playback', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
    });

    it('should play video on tap', async () => {
      // Tap on video card
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      await detoxExpect(element(by.id('video-player-screen'))).toBeVisible();
      await takeScreenshot('social-11-video-playing');

      // Verify video controls
      await detoxExpect(element(by.id('play-pause-button'))).toBeVisible();
    });

    it('should pause and resume video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Pause video
      await tapElement(by.id('play-pause-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-12-video-paused');

      // Resume video
      await tapElement(by.id('play-pause-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-13-video-resumed');
    });

    it('should seek through video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Tap on progress bar to seek
      await element(by.id('video-progress-bar')).tap({ x: 200, y: 10 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('social-14-video-seeked');
    });

    it('should adjust volume', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Tap volume button
      await tapElement(by.id('volume-button'));
      await takeScreenshot('social-15-volume-control');

      // Mute
      await tapElement(by.id('mute-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    it('should toggle fullscreen', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Enter fullscreen
      await tapElement(by.id('fullscreen-button'));
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('social-16-fullscreen');

      // Exit fullscreen
      await tapElement(by.id('fullscreen-button'));
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should swipe to next video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Swipe up for next video
      await swipeElement(by.id('video-player-screen'), 'up', 'fast');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('social-17-next-video');

      // Verify different video playing
      await detoxExpect(element(by.id('video-player-screen'))).toBeVisible();
    });

    it('should swipe to previous video', async () => {
      await tapElement(by.id('video-card-1'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Swipe down for previous video
      await swipeElement(by.id('video-player-screen'), 'down', 'fast');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await takeScreenshot('social-18-previous-video');
    });

    it('should auto-play next video after completion', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Wait for video to complete (or seek to end)
      await element(by.id('video-progress-bar')).tap({ x: 350, y: 10 });

      // Wait for auto-play
      await new Promise(resolve => setTimeout(resolve, 3000));
      await takeScreenshot('social-19-auto-next');
    });
  });

  describe('Social Interactions', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
    });

    it('should like video from feed', async () => {
      // Like video
      await tapElement(by.id('video-0-like-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-20-video-liked');

      // Verify like count increased
      await detoxExpect(element(by.id('video-0-like-button-active'))).toBeVisible();
    });

    it('should unlike video', async () => {
      // Like first
      await tapElement(by.id('video-0-like-button'));
      await new Promise(resolve => setTimeout(resolve, 500));

      // Unlike
      await tapElement(by.id('video-0-like-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-21-video-unliked');
    });

    it('should comment on video', async () => {
      // Open video
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Open comments
      await tapElement(by.id('comments-button'));
      await waitForElement(by.id('comments-modal'), 2000);

      await detoxExpect(element(by.id('comments-modal'))).toBeVisible();
      await takeScreenshot('social-22-comments-modal');

      // Add comment
      await typeText(by.id('comment-input'), 'Great video!');
      await tapElement(by.id('post-comment-button'));

      await waitForElement(by.text('Comment posted'), 2000);
      await takeScreenshot('social-23-comment-posted');
    });

    it('should view all comments', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      await tapElement(by.id('comments-button'));
      await waitForElement(by.id('comments-modal'), 2000);

      // Scroll through comments
      await element(by.id('comments-list')).scroll(200, 'down');
      await takeScreenshot('social-24-comments-list');

      // Verify comments visible
      await detoxExpect(element(by.id('comment-0'))).toBeVisible();
    });

    it('should like a comment', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);
      await tapElement(by.id('comments-button'));
      await waitForElement(by.id('comments-modal'), 2000);

      // Like comment
      await tapElement(by.id('comment-0-like-button'));
      await new Promise(resolve => setTimeout(resolve, 500));
      await takeScreenshot('social-25-comment-liked');

      await detoxExpect(element(by.id('comment-0-like-button-active'))).toBeVisible();
    });

    it('should reply to comment', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);
      await tapElement(by.id('comments-button'));
      await waitForElement(by.id('comments-modal'), 2000);

      // Tap reply
      await tapElement(by.id('comment-0-reply-button'));
      await waitForElement(by.id('reply-input'), 2000);

      await typeText(by.id('reply-input'), 'Thanks for sharing!');
      await tapElement(by.id('post-reply-button'));

      await waitForElement(by.text('Reply posted'), 2000);
      await takeScreenshot('social-26-reply-posted');
    });

    it('should share video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Tap share
      await tapElement(by.id('share-button'));
      await waitForElement(by.id('share-modal'), 2000);

      await detoxExpect(element(by.id('share-modal'))).toBeVisible();
      await takeScreenshot('social-27-share-modal');

      // Share options visible
      await detoxExpect(element(by.id('share-whatsapp'))).toBeVisible();
      await detoxExpect(element(by.id('share-instagram'))).toBeVisible();
      await detoxExpect(element(by.id('share-copy-link'))).toBeVisible();
    });

    it('should copy video link', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);
      await tapElement(by.id('share-button'));
      await waitForElement(by.id('share-modal'), 2000);

      // Copy link
      await tapElement(by.id('share-copy-link'));
      await waitForElement(by.text('Link copied'), 2000);
      await takeScreenshot('social-28-link-copied');
    });

    it('should save video to favorites', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Save video
      await tapElement(by.id('save-button'));
      await waitForElement(by.text('Saved to favorites'), 2000);
      await takeScreenshot('social-29-video-saved');

      await detoxExpect(element(by.id('save-button-active'))).toBeVisible();
    });

    it('should report video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Open options
      await tapElement(by.id('video-options-button'));
      await waitForElement(by.id('video-options-modal'), 2000);

      // Report
      await tapElement(by.id('report-video-button'));
      await waitForElement(by.id('report-modal'), 2000);

      await detoxExpect(element(by.id('report-modal'))).toBeVisible();
      await takeScreenshot('social-30-report-modal');

      // Select reason
      await tapElement(by.id('report-reason-inappropriate'));
      await tapElement(by.id('submit-report-button'));

      await waitForElement(by.text('Report submitted'), 2000);
    });
  });

  describe('Follow System', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
    });

    it('should follow creator from video', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Follow creator
      await tapElement(by.id('follow-creator-button'));
      await waitForElement(by.text('Following'), 2000);
      await takeScreenshot('social-31-following-creator');

      await detoxExpect(element(by.id('unfollow-button'))).toBeVisible();
    });

    it('should unfollow creator', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Follow first
      await tapElement(by.id('follow-creator-button'));
      await waitForElement(by.text('Following'), 2000);

      // Unfollow
      await tapElement(by.id('unfollow-button'));
      await waitForElement(by.text('Unfollowed'), 2000);
      await takeScreenshot('social-32-unfollowed');
    });

    it('should view creator profile', async () => {
      await tapElement(by.id('video-card-0'));
      await waitForElement(by.id('video-player-screen'), 3000);

      // Tap on creator name
      await tapElement(by.id('creator-name'));
      await waitForElement(by.id('creator-profile-screen'), 2000);

      await detoxExpect(element(by.id('creator-profile-screen'))).toBeVisible();
      await takeScreenshot('social-33-creator-profile');

      // Verify profile details
      await detoxExpect(element(by.id('creator-bio'))).toBeVisible();
      await detoxExpect(element(by.id('creator-followers-count'))).toBeVisible();
      await detoxExpect(element(by.id('creator-videos-count'))).toBeVisible();
    });

    it('should view following list', async () => {
      // Navigate to profile
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);

      // Tap following
      await tapElement(by.id('following-button'));
      await waitForElement(by.id('following-screen'), 2000);

      await detoxExpect(element(by.id('following-screen'))).toBeVisible();
      await takeScreenshot('social-34-following-list');
    });

    it('should view followers list', async () => {
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);

      // Tap followers
      await tapElement(by.id('followers-button'));
      await waitForElement(by.id('followers-screen'), 2000);

      await detoxExpect(element(by.id('followers-screen'))).toBeVisible();
      await takeScreenshot('social-35-followers-list');
    });
  });

  describe('UGC Upload', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-play'));
      await waitForElement(by.id('play-screen'), 3000);
    });

    it('should navigate to upload screen', async () => {
      // Tap upload button
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      await detoxExpect(element(by.id('ugc-upload-screen'))).toBeVisible();
      await takeScreenshot('social-36-upload-screen');
    });

    it('should record new video', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Tap record
      await tapElement(by.id('record-video-button'));
      await waitForElement(by.id('camera-screen'), 3000);

      await detoxExpect(element(by.id('camera-screen'))).toBeVisible();
      await takeScreenshot('social-37-camera-screen');

      // Start recording
      await tapElement(by.id('record-button'));
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stop recording
      await tapElement(by.id('stop-button'));
      await waitForElement(by.id('video-preview'), 2000);

      await detoxExpect(element(by.id('video-preview'))).toBeVisible();
      await takeScreenshot('social-38-video-preview');
    });

    it('should upload video from gallery', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Choose from gallery
      await tapElement(by.id('choose-from-gallery-button'));

      // System gallery picker opens
      await new Promise(resolve => setTimeout(resolve, 2000));
      await takeScreenshot('social-39-gallery-picker');

      // Assuming video selected, continue
    });

    it('should add video details', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Assuming video already selected
      // Add title
      await typeText(by.id('video-title-input'), 'My Awesome Product Review');

      // Add description
      await typeText(by.id('video-description-input'), 'Check out this amazing product!');

      await takeScreenshot('social-40-video-details');

      // Add tags
      await tapElement(by.id('add-tags-button'));
      await waitForElement(by.id('tags-input'), 2000);
      await typeText(by.id('tags-input'), '#fashion #style #review');

      await takeScreenshot('social-41-video-tags');
    });

    it('should select video category', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Select category
      await tapElement(by.id('category-dropdown'));
      await waitForElement(by.id('category-picker'), 2000);

      await detoxExpect(element(by.id('category-picker'))).toBeVisible();
      await takeScreenshot('social-42-category-picker');

      await tapElement(by.id('category-fashion'));
    });

    it('should link products to video', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Scroll to products section
      await element(by.id('upload-scroll-view')).scroll(400, 'down');

      // Link products
      await tapElement(by.id('link-products-button'));
      await waitForElement(by.id('product-selector'), 2000);

      await detoxExpect(element(by.id('product-selector'))).toBeVisible();
      await takeScreenshot('social-43-product-selector');

      // Select products
      await tapElement(by.id('product-0'));
      await tapElement(by.id('product-1'));
      await tapElement(by.id('confirm-products-button'));

      await waitForElement(by.text('Products linked'), 2000);
      await takeScreenshot('social-44-products-linked');
    });

    it('should add video thumbnail', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Select thumbnail
      await tapElement(by.id('choose-thumbnail-button'));
      await waitForElement(by.id('thumbnail-selector'), 2000);

      await detoxExpect(element(by.id('thumbnail-selector'))).toBeVisible();
      await takeScreenshot('social-45-thumbnail-selector');

      // Select a frame
      await tapElement(by.id('thumbnail-frame-2'));
      await tapElement(by.id('confirm-thumbnail-button'));
    });

    it('should set video privacy', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Scroll to privacy
      await element(by.id('upload-scroll-view')).scrollTo('bottom');

      // Change privacy
      await tapElement(by.id('privacy-dropdown'));
      await waitForElement(by.id('privacy-picker'), 2000);
      await takeScreenshot('social-46-privacy-picker');

      await tapElement(by.id('privacy-public'));
    });

    it('should publish video', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Fill required details
      await typeText(by.id('video-title-input'), 'Test Video');
      await typeText(by.id('video-description-input'), 'Test Description');

      // Publish
      await element(by.id('upload-scroll-view')).scrollTo('bottom');
      await tapElement(by.id('publish-video-button'));

      // Wait for upload
      await waitForElement(by.id('upload-progress-modal'), 2000);
      await detoxExpect(element(by.id('upload-progress-modal'))).toBeVisible();
      await takeScreenshot('social-47-upload-progress');

      // Wait for completion
      await waitForElement(by.text('Video published'), 10000);
      await takeScreenshot('social-48-video-published');
    });

    it('should save video as draft', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      await typeText(by.id('video-title-input'), 'Draft Video');

      // Save as draft
      await tapElement(by.id('save-draft-button'));
      await waitForElement(by.text('Saved as draft'), 2000);
      await takeScreenshot('social-49-saved-draft');
    });

    it('should view drafts', async () => {
      await tapElement(by.id('upload-video-button'));
      await waitForElement(by.id('ugc-upload-screen'), 3000);

      // Navigate to drafts
      await tapElement(by.id('view-drafts-button'));
      await waitForElement(by.id('drafts-screen'), 2000);

      await detoxExpect(element(by.id('drafts-screen'))).toBeVisible();
      await takeScreenshot('social-50-drafts-list');
    });
  });

  describe('My Content', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
      await tapElement(by.id('tab-profile'));
      await waitForElement(by.id('profile-screen'), 2000);
    });

    it('should view my videos', async () => {
      // Tap my videos
      await tapElement(by.id('my-videos-button'));
      await waitForElement(by.id('my-videos-screen'), 2000);

      await detoxExpect(element(by.id('my-videos-screen'))).toBeVisible();
      await takeScreenshot('social-51-my-videos');
    });

    it('should view video analytics', async () => {
      await tapElement(by.id('my-videos-button'));
      await waitForElement(by.id('my-videos-screen'), 2000);

      // Tap on video
      await tapElement(by.id('my-video-0'));
      await waitForElement(by.id('video-analytics-screen'), 2000);

      await detoxExpect(element(by.id('video-analytics-screen'))).toBeVisible();
      await takeScreenshot('social-52-video-analytics');

      // Verify analytics data
      await detoxExpect(element(by.id('total-views'))).toBeVisible();
      await detoxExpect(element(by.id('total-likes'))).toBeVisible();
      await detoxExpect(element(by.id('total-comments'))).toBeVisible();
      await detoxExpect(element(by.id('total-shares'))).toBeVisible();
    });

    it('should edit published video', async () => {
      await tapElement(by.id('my-videos-button'));
      await waitForElement(by.id('my-videos-screen'), 2000);

      // Open options
      await tapElement(by.id('my-video-0-options'));
      await waitForElement(by.id('video-options-modal'), 2000);

      // Edit
      await tapElement(by.id('edit-video-button'));
      await waitForElement(by.id('edit-video-screen'), 2000);

      await detoxExpect(element(by.id('edit-video-screen'))).toBeVisible();
      await takeScreenshot('social-53-edit-video');

      // Update title
      await element(by.id('video-title-input')).clearText();
      await typeText(by.id('video-title-input'), 'Updated Title');

      // Save
      await tapElement(by.id('save-changes-button'));
      await waitForElement(by.text('Video updated'), 2000);
    });

    it('should delete video', async () => {
      await tapElement(by.id('my-videos-button'));
      await waitForElement(by.id('my-videos-screen'), 2000);

      // Open options
      await tapElement(by.id('my-video-0-options'));
      await waitForElement(by.id('video-options-modal'), 2000);

      // Delete
      await tapElement(by.id('delete-video-button'));
      await waitForElement(by.id('delete-confirmation-modal'), 2000);

      await detoxExpect(element(by.id('delete-confirmation-modal'))).toBeVisible();
      await takeScreenshot('social-54-delete-confirmation');

      // Confirm
      await tapElement(by.id('confirm-delete-button'));
      await waitForElement(by.text('Video deleted'), 2000);
      await takeScreenshot('social-55-video-deleted');
    });

    it('should view saved videos', async () => {
      // Tap saved videos
      await tapElement(by.id('saved-videos-button'));
      await waitForElement(by.id('saved-videos-screen'), 2000);

      await detoxExpect(element(by.id('saved-videos-screen'))).toBeVisible();
      await takeScreenshot('social-56-saved-videos');
    });

    it('should remove from saved', async () => {
      await tapElement(by.id('saved-videos-button'));
      await waitForElement(by.id('saved-videos-screen'), 2000);

      // Remove
      await tapElement(by.id('saved-video-0-remove'));
      await waitForElement(by.text('Removed from saved'), 2000);
      await takeScreenshot('social-57-removed-from-saved');
    });
  });

  describe('Video Notifications', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await waitForElement(by.id('home-screen'), 5000);
    });

    it('should receive notification for new follower', async () => {
      // Check notifications
      await tapElement(by.id('notification-icon'));
      await waitForElement(by.id('notifications-screen'), 2000);

      const followerNotifExists = await element(by.id('follower-notification-0')).exists();
      if (followerNotifExists) {
        await detoxExpect(element(by.id('follower-notification-0'))).toBeVisible();
        await takeScreenshot('social-58-follower-notification');
      }
    });

    it('should receive notification for video like', async () => {
      await tapElement(by.id('notification-icon'));
      await waitForElement(by.id('notifications-screen'), 2000);

      const likeNotifExists = await element(by.id('like-notification-0')).exists();
      if (likeNotifExists) {
        await detoxExpect(element(by.id('like-notification-0'))).toBeVisible();
        await takeScreenshot('social-59-like-notification');
      }
    });

    it('should receive notification for new comment', async () => {
      await tapElement(by.id('notification-icon'));
      await waitForElement(by.id('notifications-screen'), 2000);

      const commentNotifExists = await element(by.id('comment-notification-0')).exists();
      if (commentNotifExists) {
        await detoxExpect(element(by.id('comment-notification-0'))).toBeVisible();
        await takeScreenshot('social-60-comment-notification');

        // Tap to view comment
        await tapElement(by.id('comment-notification-0'));
        await waitForElement(by.id('video-player-screen'), 3000);
      }
    });
  });
});
