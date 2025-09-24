import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from '@ui-kitten/components';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth';
import DashboardHeader from '../../src/components/DashboardHeader';
import { mockApi, AuditStatus } from '@trakr/shared';

export default function BranchManagerDashboard() {
  const { user } = useAuthStore();

  const { data: audits = [], isLoading: isLoadingAudits } = useQuery({
    queryKey: ['audits', 'branch-manager', user?.branchId],
    queryFn: () => mockApi.getAudits(), // In a real app, fetch by branch/org
  });

  const total = audits.length;
  const inProgress = audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length;
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).length;
  const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    { title: 'Total Audits', value: String(total), color: '#3b82f6', subtitle: 'All time' },
    { title: 'In Progress', value: String(inProgress), color: '#f59e0b', subtitle: 'Currently running' },
    { title: 'Completed', value: String(completed), color: '#10b981', subtitle: 'All time' },
    { title: 'Compliance Rate', value: `${complianceRate}%`, color: '#10b981', subtitle: 'Completed / Total' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Branch Manager Dashboard" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.welcomeCard}>
          <Text category="h6" style={styles.welcomeTitle}>
            Welcome back, {user?.name || 'User'}! 🏬
          </Text>
          <Text category="p2" appearance="hint">
            Manage audits and oversee branch operations.
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
          <Text category="h6" style={styles.sectionTitle}>Branch Audit Overview</Text>
          <Card style={styles.card}>
            {isLoadingAudits ? (
              <Text appearance="hint">Loading audits...</Text>
            ) : (
              <Text appearance="hint">Total: {total} • In Progress: {inProgress} • Completed: {completed}</Text>
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
  placeholderText: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
