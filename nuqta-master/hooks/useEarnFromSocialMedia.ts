// hooks/useEarnFromSocialMedia.ts - State management hook for Earn From Social Media feature

import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import {
  EarnSocialState,
  UseEarnSocialReturn,
  InstagramPostValidation
} from '@/types/earn-social.types';
import EarnSocialData from '@/data/earnSocialData';

export const useEarnFromSocialMedia = (orderId?: string): UseEarnSocialReturn => {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [state, setState] = useState<EarnSocialState>(EarnSocialData.initialState);
  const [contextOrderId] = useState(orderId);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clear progress interval on unmount
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Initialize data on mount
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    initializeEarnSocialData();
  }, [authLoading, isAuthenticated]);

  const initializeEarnSocialData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Load user's earnings and posts
      const earnings = await EarnSocialData.api.getEarnings();
      const posts = await EarnSocialData.api.getUserPosts();
      
      setState(prev => ({
        ...prev,
        loading: false,
        earnings,
        posts,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load earnings data'
      }));
    }
  }, []);

  const setInstagramUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      instagramUrl: url,
      isValidUrl: EarnSocialData.helpers.validateInstagramUrl(url),
      error: null
    }));
  }, []);

  const validateInstagramUrl = useCallback((url: string): boolean => {
    return EarnSocialData.helpers.validateInstagramUrl(url);
  }, []);

  const submitPost = useCallback(async (): Promise<void> => {
    if (!state.instagramUrl || !state.isValidUrl) {
      setState(prev => ({ 
        ...prev, 
        error: 'Please enter a valid Instagram post URL' 
      }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      currentStep: 'uploading',
      uploadProgress: 0,
      error: null 
    }));

    try {
      // Clear any existing progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Simulate upload progress
      progressIntervalRef.current = setInterval(() => {
        if (!isMountedRef.current) return;
        setState(prev => {
          const newProgress = Math.min(prev.uploadProgress + 10, 90);
          return { ...prev, uploadProgress: newProgress };
        });
      }, 200);

      // Validate URL with API
      const validation = await EarnSocialData.api.validateInstagramUrl(state.instagramUrl);

      if (!validation.isValid) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        if (!isMountedRef.current) return;
        setState(prev => ({
          ...prev,
          loading: false,
          currentStep: 'error',
          error: validation.error || 'Invalid Instagram URL',
          uploadProgress: 0
        }));
        return;
      }

      // Submit the post with order/product ID if available

      const result = await EarnSocialData.api.submitPost(state.instagramUrl, contextOrderId);

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (!isMountedRef.current) return;
      setState(prev => ({ ...prev, uploadProgress: 100 }));

      if (result.success) {
        // Add new post to the list
        const newPost = {
          id: result.data.postId,
          url: state.instagramUrl,
          status: 'pending' as const,
          submittedAt: new Date(),
          cashbackAmount: result.data.cashbackAmount,
          platform: 'instagram' as const
        };

        if (!isMountedRef.current) return;
        setState(prev => ({
          ...prev,
          loading: false,
          currentStep: 'success',
          success: true,
          posts: [newPost, ...prev.posts],
          instagramUrl: '', // Reset URL
          uploadProgress: 0
        }));
      } else {
        if (!isMountedRef.current) return;
        setState(prev => ({
          ...prev,
          loading: false,
          currentStep: 'error',
          error: result.error || 'Failed to submit post',
          uploadProgress: 0
        }));
      }
    } catch (error) {
      // Clear interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (!isMountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        currentStep: 'error',
        error: 'Network error. Please try again.',
        uploadProgress: 0
      }));
    }
  }, [state.instagramUrl, state.isValidUrl]);

  const resetForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'overview',
      instagramUrl: '',
      isValidUrl: false,
      loading: false,
      error: null,
      success: false,
      uploadProgress: 0
    }));
  }, []);

  const refreshEarnings = useCallback(async () => {
    try {
      const earnings = await EarnSocialData.api.getEarnings();
      const posts = await EarnSocialData.api.getUserPosts();
      
      setState(prev => ({
        ...prev,
        earnings,
        posts
      }));
    } catch (error) {
      // Silently fail refresh
    }
  }, []);

  // Handler functions for components
  const handleUrlChange = useCallback((url: string) => {
    setInstagramUrl(url);
  }, [setInstagramUrl]);

  const handleSubmit = useCallback(async () => {
    await submitPost();
  }, [submitPost]);

  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'url_input',
      error: null,
      loading: false
    }));
  }, []);

  const handleGoBack = useCallback(() => {
    if (state.currentStep === 'url_input' || state.currentStep === 'uploading') {
      setState(prev => ({ ...prev, currentStep: 'overview' }));
    } else if (state.currentStep === 'success' || state.currentStep === 'error') {
      // On success/error, navigate to home page
      router.replace('/');
    } else {
      // For overview, try to go back or go to home
      try {
        router.back();
      } catch (error) {
        router.replace('/');
      }
    }
  }, [state.currentStep]);

  const handleStartUpload = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: 'url_input' }));
  }, []);

  // Clear error after some time
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Clear success state after some time
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, success: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  return {
    state,
    actions: {
      setInstagramUrl,
      validateInstagramUrl,
      submitPost,
      resetForm,
      refreshEarnings
    },
    handlers: {
      handleUrlChange,
      handleSubmit,
      handleRetry,
      handleGoBack,
      handleStartUpload
    }
  };
};
