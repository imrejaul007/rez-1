import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuthUser, useIsAuthenticated, useAuthLoading, useAuthError, useAuthActions } from '@/stores/selectors';
import { getAuthToken, getRefreshToken, getUser } from '@/utils/authStorage';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function AuthDebugger() {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const authError = useAuthError();
  const actions = useAuthActions();
  const [storageData, setStorageData] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);
  const isMounted = useIsMounted();

  const checkStorageData = async () => {
    try {
      const [token, refreshToken, user] = await Promise.all([
        getAuthToken(),
        getRefreshToken(),
        getUser(),
      ]);
      
      // Safely parse user data
      const parsedUser = user || null;

      if (!isMounted()) return;
      setStorageData({
        accessToken: token ? 'exists' : 'missing',
        refreshToken: refreshToken ? 'exists' : 'missing',
        user: parsedUser
      });
    } catch (error) {
      // silently handle
    }
  };

  useEffect(() => {
    checkStorageData();
  }, [user, isAuthenticated, authLoading, authError]);

  if (!isVisible) {
    return (
      <Pressable 
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Text style={styles.toggleText}>🔍</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Auth Debugger</Text>
        <Pressable onPress={() => setIsVisible(false)}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth State:</Text>
        <Text style={styles.item}>Loading: {authLoading ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Authenticated: {isAuthenticated ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Has User: {user ? '✅' : '❌'}</Text>
        <Text style={styles.item}>User ID: {user?.id || 'none'}</Text>
        <Text style={styles.item}>Onboarded: {user?.isOnboarded ? '✅' : '❌'}</Text>
        <Text style={styles.item}>Error: {authError || 'none'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Data:</Text>
        <Text style={styles.item}>Access Token: {storageData.accessToken}</Text>
        <Text style={styles.item}>Refresh Token: {storageData.refreshToken}</Text>
        <Text style={styles.item}>Stored User: {storageData.user?.id || 'none'}</Text>
      </View>

      <Pressable 
        style={styles.refreshButton}
        onPress={checkStorageData}
      >
        <Text style={styles.refreshText}>🔄 Refresh</Text>
      </Pressable>

      <Pressable 
        style={styles.checkAuthButton}
        onPress={actions.checkAuthStatus}
      >
        <Text style={styles.checkAuthText}>🔍 Check Auth Status</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  toggleText: {
    color: 'white',
    fontSize: 16,
  },
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 15,
    borderRadius: 10,
    minWidth: 300,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    color: colors.brand.purpleLight,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  item: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
  refreshButton: {
    backgroundColor: colors.brand.purpleLight,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 5,
  },
  refreshText: {
    color: 'white',
    fontWeight: 'bold',
  },
  checkAuthButton: {
    backgroundColor: colors.success,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  checkAuthText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default React.memo(AuthDebugger);
