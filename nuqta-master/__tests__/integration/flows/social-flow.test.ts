/**
 * Social Flow Integration Tests
 *
 * Complete user journey for UGC and social interactions
 */

import { ugcApi } from '@/services/ugcApi';
import { followApi } from '@/services/followApi';
import apiClient from '@/services/apiClient';
import {
  setupAuthenticatedUser,
  cleanupAfterTest,
  testDataFactory,
} from '../utils/testHelpers';
import { setupMockHandlers } from '../utils/mockApiHandlers';

jest.mock('@/services/apiClient');

describe('Social Flow Integration Tests', () => {
  beforeEach(async () => {
    await setupAuthenticatedUser();
    setupMockHandlers(apiClient);
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  describe('Complete UGC Journey', () => {
    it('should complete: View Feed → Like/Comment → Upload Content → Share', async () => {
      // Step 1: View UGC feed
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          content: [testDataFactory.ugcContent()],
          pagination: { page: 1, hasMore: true },
        },
      });

      const feed = await ugcApi.getUGCFeed({ page: 1 });
      expect(feed.content.length).toBeGreaterThan(0);

      // Step 2: Like content
      const contentId = feed.content[0].id;
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { contentId, liked: true, likes: 11 },
      });

      const likeResult = await ugcApi.likeContent(contentId);
      expect(likeResult.liked).toBe(true);

      // Step 3: Comment on content
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'comment_123',
          contentId,
          comment: 'Great content!',
          user: { id: 'user_123', name: 'Test User' },
        },
      });

      const comment = await ugcApi.addComment(contentId, 'Great content!');
      expect(comment.comment).toBe('Great content!');

      // Step 4: Upload own content
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'ugc_new_123',
          url: 'https://cdn.example.com/video.mp4',
          status: 'processing',
        },
      });

      const uploadResult = await ugcApi.uploadContent({
        type: 'video',
        file: 'mock_file',
        caption: 'My new video',
        productIds: ['prod_1', 'prod_2'],
      });
      expect(uploadResult.id).toBeDefined();

      // Step 5: Share content
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { shared: true, platform: 'instagram' },
      });

      const shareResult = await ugcApi.shareContent(uploadResult.id, 'instagram');
      expect(shareResult.shared).toBe(true);
    });

    it('should handle follow/unfollow flow', async () => {
      // Follow user
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { userId: 'user_456', following: true },
      });

      const followResult = await followApi.followUser('user_456');
      expect(followResult.following).toBe(true);

      // Get follower's content
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          content: [testDataFactory.ugcContent()],
        },
      });

      const followingFeed = await ugcApi.getFollowingFeed();
      expect(followingFeed.content).toBeDefined();

      // Unfollow user
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { userId: 'user_456', following: false },
      });

      const unfollowResult = await followApi.unfollowUser('user_456');
      expect(unfollowResult.following).toBe(false);
    });
  });

  describe('Content Discovery', () => {
    it('should browse trending content', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          trending: [
            testDataFactory.ugcContent(),
            { ...testDataFactory.ugcContent(), id: 'ugc_2', likes: 100 },
          ],
        },
      });

      const trending = await ugcApi.getTrendingContent();
      expect(trending.trending.length).toBeGreaterThan(0);
    });

    it('should search content by hashtags', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          content: [testDataFactory.ugcContent()],
          hashtag: '#fashion',
        },
      });

      const hashtagResults = await ugcApi.searchByHashtag('#fashion');
      expect(hashtagResults.content).toBeDefined();
    });

    it('should browse content by product', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          content: [testDataFactory.ugcContent()],
          productId: 'prod_123',
        },
      });

      const productContent = await ugcApi.getContentByProduct('prod_123');
      expect(productContent.content).toBeDefined();
    });
  });

  describe('Content Interactions', () => {
    it('should handle video playback tracking', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { tracked: true },
      });

      await ugcApi.trackVideoView('ugc_123', { duration: 30 });
      expect(apiClient.post).toHaveBeenCalled();
    });

    it('should report inappropriate content', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          reportId: 'report_123',
          status: 'submitted',
        },
      });

      const report = await ugcApi.reportContent('ugc_123', {
        reason: 'inappropriate',
        description: 'Test report',
      });
      expect(report.reportId).toBeDefined();
    });
  });
});
