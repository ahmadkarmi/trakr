import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { UserRole, USER_ROLE_LABELS } from '@trakr/shared';
import { useAuthStore } from '../src/stores/auth';

export default function LoginScreen() {
  console.log('Login Screen - Rendering...');
  
  const { signIn, isLoading } = useAuthStore();
  const navigation = useNavigation();

  const handleRoleLogin = async (role: UserRole) => {
    console.log('Login - Selected role:', role);
    
    // Map roles to stack screen names
    let screenName: string = 'DashboardAuditor';
    switch (role) {
      case UserRole.AUDITOR:
        screenName = 'DashboardAuditor';
        break;
      case UserRole.BRANCH_MANAGER:
        screenName = 'DashboardBranchManager';
        break;
      case UserRole.ADMIN:
      case UserRole.SUPER_ADMIN:
        screenName = 'DashboardAdmin';
        break;
    }
    
    await signIn(role);
    // Replace history so back does not return to Login
    // @ts-ignore - navigation type is inferred at runtime
    navigation.reset({ index: 0, routes: [{ name: screenName }] });
  };

  const roleButtons = [
    { role: UserRole.AUDITOR, icon: '🕵️‍♂️' },
    { role: UserRole.BRANCH_MANAGER, icon: '🏬' },
    { role: UserRole.ADMIN, icon: '🛠️' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Trakr</Text>
          <Text style={styles.subtitle}>
            Modern Audit Management
          </Text>
          <Text style={styles.description}>
            Select your role to continue to the application
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          {roleButtons.map(({ role, icon }) => (
            <TouchableOpacity
              key={role}
              style={styles.roleButton}
              onPress={() => handleRoleLogin(role)}
            >
              <Text style={styles.buttonIcon}>{icon}</Text>
              <Text style={styles.buttonText}>
                Login as {USER_ROLE_LABELS[role]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a demo application with mock authentication.
          </Text>
          <Text style={styles.footerText}>
            Choose any role to explore the features.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 48,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 4,
    lineHeight: 16,
  },
});
