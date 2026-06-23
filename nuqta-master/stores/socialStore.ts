import { create } from 'zustand';
import * as activityFeedApi from '../services/activityFeedApi';
import { Activity, UserProfile } from '../services/activityFeedApi';

interface SocialStoreState {
  // Feed state
  activities: Activity[];
  isLoadingFeed: boolean;
  feedPage: number;
  hasMoreActivities: boolean;
  suggestedUsers: UserProfile[];

  // Actions
  loadFeed: (refresh?: boolean) => Promise<void>;
  loadMoreActivities: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  likeActivity: (activityId: string) => Promise<void>;
  commentOnActivity: (activityId: string, comment: string) => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  loadUserActivities: (userId: string) => Promise<Activity[]>;
  loadFollowers: (userId: string) => Promise<UserProfile[]>;
  loadFollowing: (userId: string) => Promise<UserProfile[]>;
  loadSuggestedUsers: () => Promise<void>;
}

export const useSocialStore = create<SocialStoreState>((set, get) => ({
  activities: [],
  isLoadingFeed: false,
  feedPage: 1,
  hasMoreActivities: true,
  suggestedUsers: [],

  loadFeed: async (refresh: boolean = false) => {
    const state = get();
    if (state.isLoadingFeed) return;

    try {
      set({ isLoadingFeed: true });
      const page = refresh ? 1 : state.feedPage;

      const { activities: newActivities, pagination } = await activityFeedApi.getActivityFeed(page, 20);

      if (refresh) {
        set({ activities: newActivities, feedPage: 1 });
      } else {
        set((s) => {
          const merged = [...s.activities, ...newActivities];
          return { activities: merged.length > 500 ? merged.slice(-500) : merged };
        });
      }

      set({ hasMoreActivities: pagination.hasMore });
    } catch (_error) {
      // silently handle
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  loadMoreActivities: async () => {
    const state = get();
    if (!state.hasMoreActivities || state.isLoadingFeed) return;

    const nextPage = state.feedPage + 1;
    set({ feedPage: nextPage });

    try {
      set({ isLoadingFeed: true });
      const { activities: newActivities, pagination } = await activityFeedApi.getActivityFeed(nextPage, 20);

      set((s) => {
        const merged = [...s.activities, ...newActivities];
        return {
          activities: merged.length > 500 ? merged.slice(-500) : merged,
          hasMoreActivities: pagination.hasMore,
        };
      });
    } catch (_error) {
      // silently handle
    } finally {
      set({ isLoadingFeed: false });
    }
  },

  refreshFeed: async () => {
    await get().loadFeed(true);
  },

  likeActivity: async (activityId: string) => {
    const { liked } = await activityFeedApi.toggleLike(activityId);

    set((s) => ({
      activities: s.activities.map((activity) =>
        activity._id === activityId ? { ...activity, hasLiked: liked } : activity
      ),
    }));
  },

  commentOnActivity: async (activityId: string, comment: string) => {
    await activityFeedApi.addComment(activityId, comment);

    set((s) => ({
      activities: s.activities.map((activity) =>
        activity._id === activityId ? { ...activity, hasCommented: true } : activity
      ),
    }));
  },

  followUser: async (userId: string) => {
    await activityFeedApi.toggleFollow(userId);
    await get().loadSuggestedUsers();
  },

  unfollowUser: async (userId: string) => {
    await activityFeedApi.toggleFollow(userId);
  },

  loadUserActivities: async (userId: string): Promise<Activity[]> => {
    try {
      const { activities } = await activityFeedApi.getUserActivities(userId, 1, 20);
      return activities;
    } catch (_error) {
      return [];
    }
  },

  loadFollowers: async (userId: string): Promise<UserProfile[]> => {
    try {
      const { followers } = await activityFeedApi.getFollowers(userId, 1, 50);
      return followers;
    } catch (_error) {
      return [];
    }
  },

  loadFollowing: async (userId: string): Promise<UserProfile[]> => {
    try {
      const { following } = await activityFeedApi.getFollowing(userId, 1, 50);
      return following;
    } catch (_error) {
      return [];
    }
  },

  loadSuggestedUsers: async () => {
    try {
      const users = await activityFeedApi.getSuggestedUsers(10);
      set({ suggestedUsers: users });
    } catch (_error) {
      // silently handle
    }
  },
}));
