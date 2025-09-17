import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Card, Button } from '@ui-kitten/components';
import DashboardHeader from '../../src/components/DashboardHeader';

export default function AuditSummary() {
  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Summary" />
      <View style={styles.content}>
        <Card>
          <Text category="s1" style={styles.title}>Final Summary</Text>
          <Text appearance="hint">This is a placeholder for the audit summary screen.</Text>
          <View style={styles.actions}>
            <Button status="primary" style={styles.button}>Share PDF</Button>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  actions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  button: { minWidth: 140 },
});
