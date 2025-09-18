import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Card, Button } from '@ui-kitten/components';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth';
import DashboardHeader from '../../src/components/DashboardHeader';
import { mockApi } from '@trakr/shared';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data: orgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: mockApi.getOrganizations,
  });
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches', orgs[0]?.id],
    queryFn: () => mockApi.getBranches(orgs[0]?.id),
    enabled: orgs.length > 0,
  });
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: mockApi.getUsers,
  });
  const { data: surveys = [], isLoading: loadingSurveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: mockApi.getSurveys,
  });
  const { data: audits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['audits', 'admin'],
    queryFn: () => mockApi.getAudits(),
  });

  const stats = [
    { title: 'Organizations', value: String(orgs.length), color: '#3b82f6', subtitle: 'Managed orgs' },
    { title: 'Branches', value: String(branches.length), color: '#3b82f6', subtitle: 'Across orgs' },
    { title: 'Users', value: String(users.length), color: '#3b82f6', subtitle: 'Active users' },
    { title: 'Audit Templates', value: String(surveys.length), color: '#3b82f6', subtitle: 'Available templates' },
  ];

  const quickActions = [
    'Manage Survey Templates',
    'Manage Users',
    'View System Logs',
    'Export Reports',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Admin Dashboard" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.welcomeCard}>
          <Text category="h6" style={styles.welcomeTitle}>
            Welcome back, {user?.name || 'User'}! 🛠️
          </Text>
          <Text category="p2" appearance="hint">
            Manage the entire audit system, users, and templates.
          </Text>
        </Card>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <Text category="c1" appearance="hint" style={styles.statTitle}>
                {stat.title}
              </Text>
              <Text category="h4" status="primary" style={styles.statValue}>
                {stat.value}
              </Text>
              <Text category="c2" appearance="hint">
                {stat.subtitle}
              </Text>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text category="h6" style={styles.sectionTitle}>Quick Actions</Text>
          <Card style={styles.card}>
            {quickActions.map((action, index) => (
              <Button
                key={index}
                style={styles.actionButton}
                appearance="filled"
                status="primary"
              >
                {action}
              </Button>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text category="h6" style={styles.sectionTitle}>Recent Activity</Text>
          <Card style={styles.card}>
            {loadingAudits ? (
              <Text appearance="hint">Loading recent activity…</Text>
            ) : audits.length === 0 ? (
              <Text appearance="hint">No recent audits.</Text>
            ) : (
              <Text appearance="hint">Total audits: {audits.length}</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  welcomeCard: {
    marginBottom: 24,
    marginTop: 16,
  },
  welcomeTitle: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
  },
  statTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  statValue: {
    marginBottom: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    // UI Kitten Card handles styling
  },
  actionButton: {
    marginBottom: 12,
  },
  placeholderText: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
