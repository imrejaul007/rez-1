/**
 * Unit Tests for useVideoManager hook
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useVideoManager } from '@/hooks/useVideoManager';

describe('useVideoManager', () => {
  it('should manage video playback state', () => {
    const { result } = renderHook(() => useVideoManager());

    expect(result.current.currentVideo).toBeNull();
  });

  it('should play video', () => {
    const { result } = renderHook(() => useVideoManager());

    act(() => {
      result.current.playVideo('video-123');
    });

    expect(result.current.currentVideo).toBe('video-123');
  });

  it('should pause video', () => {
    const { result } = renderHook(() => useVideoManager());

    act(() => {
      result.current.playVideo('video-123');
      result.current.pauseVideo();
    });

    expect(result.current.isPlaying).toBe(false);
  });
});
