import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from './src/stores/auth';
import { ApplicationProvider } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';
import theme from './src/theme/custom-theme.json';
import LoginScreen from './screens/login';
import DashboardAuditor from './screens/dashboard/auditor';
import DashboardBranchManager from './screens/dashboard/branch-manager';
import DashboardAdmin from './screens/dashboard/admin';
import AuditWizard from './screens/audit/wizard';
import AuditDetail from './screens/audit/detail';
import AuditSummary from './screens/audit/summary';
import { UserRole } from '@trakr/shared';

const Stack = createNativeStackNavigator();

export default function App() {
  const { isLoading, isAuthenticated, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const getHomeScreenName = (role) => {
    switch (role) {
      case UserRole.AUDITOR:
        return 'DashboardAuditor';
      case UserRole.BRANCH_MANAGER:
        return 'DashboardBranchManager';
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        return 'DashboardAdmin';
      default:
        return 'Login';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingTitle}>Loading Trakr</Text>
        <Text style={styles.loadingSubtitle}>Initializing application...</Text>
      </View>
    );
  }

  const initialRouteName = isAuthenticated ? getHomeScreenName(user?.role) : 'Login';

  return (
    <ApplicationProvider {...eva} theme={{ ...eva.light, ...theme }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="DashboardAuditor" component={DashboardAuditor} />
          <Stack.Screen name="DashboardBranchManager" component={DashboardBranchManager} />
          <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} />
          <Stack.Screen name="AuditWizard" component={AuditWizard} />
          <Stack.Screen name="AuditDetail" component={AuditDetail} />
          <Stack.Screen name="AuditSummary" component={AuditSummary} />
        </Stack.Navigator>
      </NavigationContainer>
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
});
