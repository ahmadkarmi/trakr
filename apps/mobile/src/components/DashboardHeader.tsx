import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Layout, Text, Button } from '@ui-kitten/components';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/auth';
import { USER_ROLE_LABELS } from '@trakr/shared';

interface DashboardHeaderProps {
  title: string;
}

export default function DashboardHeader({ title }: DashboardHeaderProps) {
  const { user, signOut } = useAuthStore();
  const navigation = useNavigation();

  const handleSignOut = () => {
    signOut();
    // @ts-ignore - navigation type is inferred at runtime
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <Layout style={styles.header} level="2">
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text category="h6" status="primary">Trakr</Text>
          <Text category="s1" appearance="hint" style={styles.divider}>|</Text>
          <Text category="s1" style={styles.pageTitle}>{title}</Text>
        </View>
        
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Text category="s2">{user?.name}</Text>
            <Text category="c1" appearance="hint">
              {user?.role && USER_ROLE_LABELS[user.role]}
            </Text>
          </View>
          <Button
            size="small"
            appearance="outline"
            onPress={handleSignOut}
          >
            Sign Out
          </Button>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    marginHorizontal: 12,
  },
  pageTitle: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
});
