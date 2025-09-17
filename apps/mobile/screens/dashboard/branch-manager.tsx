import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Card } from '@ui-kitten/components';
import { useAuthStore } from '../../src/stores/auth';
import DashboardHeader from '../../src/components/DashboardHeader';

export default function BranchManagerDashboard() {
  const { user } = useAuthStore();

  const stats = [
    { title: 'Total Audits', value: '24', color: '#3b82f6', subtitle: 'This month' },
    { title: 'Pending Review', value: '8', color: '#f59e0b', subtitle: 'Awaiting approval' },
    { title: 'Approved', value: '15', color: '#10b981', subtitle: 'This month' },
    { title: 'Compliance Rate', value: '87%', color: '#10b981', subtitle: 'Average score' },
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
            <Text category="p2" appearance="hint" style={styles.placeholderText}>
              Branch audit management interface will be implemented here
            </Text>
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
