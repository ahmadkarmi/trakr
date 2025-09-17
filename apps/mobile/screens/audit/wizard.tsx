import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Button, Card } from '@ui-kitten/components';
import DashboardHeader from '../../src/components/DashboardHeader';

export default function AuditWizard() {
  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Wizard" />
      <View style={styles.content}>
        <Card>
          <Text category="s1" style={styles.title}>Step-by-step Audit Wizard</Text>
          <Text appearance="hint">This is a placeholder for the multi-step audit flow.</Text>
          <View style={styles.actions}>
            <Button status="primary" style={styles.button}>Next</Button>
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
  button: { minWidth: 120 },
});
