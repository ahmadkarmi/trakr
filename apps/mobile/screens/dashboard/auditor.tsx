import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Card, Button } from '@ui-kitten/components';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth';
import DashboardHeader from '../../src/components/DashboardHeader';
import { mockApi, AuditStatus } from '@trakr/shared';
import { useNavigation } from '@react-navigation/native';

export default function AuditorDashboard() {
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ['audits', user?.id],
    queryFn: () => mockApi.getAudits({ assignedTo: user?.id }),
    enabled: !!user?.id,
  });

  const pending = audits.filter(a => a.status === AuditStatus.DRAFT).length;
  const inProgress = audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length;
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).length;

  const stats = [
    { title: 'Pending Audits', value: String(pending), color: '#3b82f6', subtitle: 'Awaiting completion' },
    { title: 'In Progress', value: String(inProgress), color: '#f59e0b', subtitle: 'Currently working on' },
    { title: 'Completed', value: String(completed), color: '#10b981', subtitle: 'This month' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Auditor Dashboard" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.welcomeCard}>
          <Text category="h6" style={styles.welcomeTitle}>
            Welcome back, {user?.name || 'User'}! 🕵️‍♂️
          </Text>
          <Text category="p2" appearance="hint">
            Here you can view and complete your assigned audits.
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
          <Text category="h6" style={styles.sectionTitle}>My Audits</Text>
          {isLoading ? (
            <Card><Text appearance="hint">Loading audits...</Text></Card>
          ) : audits.length === 0 ? (
            <Card><Text appearance="hint">No audits assigned.</Text></Card>
          ) : (
            audits.map((audit) => (
              <Card key={audit.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text category="s1">Audit {audit.id}</Text>
                    <Text category="c1" appearance="hint">Status: {audit.status}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button
                      size="small"
                      appearance="outline"
                      onPress={() => {
                        // @ts-ignore
                        navigation.navigate('AuditDetail', { auditId: audit.id });
                      }}
                      style={{ marginRight: 8 }}
                    >
                      Details
                    </Button>
                    <Button
                      size="small"
                      status="primary"
                      onPress={() => {
                        // @ts-ignore
                        navigation.navigate('AuditWizard', { auditId: audit.id });
                      }}
                    >
                      Continue
                    </Button>
                  </View>
                </View>
              </Card>
            ))
          )}
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
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
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
