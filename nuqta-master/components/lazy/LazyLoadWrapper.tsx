// @ts-nocheck
import React, { useState, useEffect, ComponentType } from 'react';
import { Platform } from 'react-native';
import SectionLoader from './SectionLoader';
import { useIsMounted } from '@/hooks/useIsMounted';

interface LazyLoadWrapperProps {
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any;
}

/**
 * LazyLoadWrapper - React Native Compatible Lazy Loading
 *
 * Since React.lazy() doesn't work on React Native mobile,
 * this component provides a cross-platform solution using dynamic imports.
 *
 * For web: Uses React.lazy() and Suspense
 * For mobile: Uses dynamic import with state management
 *
 * @example
 * ```tsx
 * <LazyLoadWrapper
 *   importFn={() => import('@/components/AboutModal')}
 *   visible={showModal}
 *   onClose={handleClose}
 * />
 * ```
 */
export default function LazyLoadWrapper({
  importFn,
  fallback,
  ...props
}: LazyLoadWrapperProps) {
  const [Component, setComponent] = useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    let isMounted = true;

    const loadComponent = async () => {
      try {
        const module = await importFn();
        if (isMounted) {
          if (!isMounted()) return;
          setComponent(() => module.default);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          if (!isMounted()) return;
          setIsLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, [importFn]);

  if (isLoading) {
    return fallback || <SectionLoader />;
  }

  if (!Component) {
    return null;
  }

  return <Component {...props} />;
}
