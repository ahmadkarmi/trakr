import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Card, Button } from '@ui-kitten/components';
import DashboardHeader from '../../src/components/DashboardHeader';

export default function AuditDetail() {
  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Detail" />
      <View style={styles.content}>
        <Card>
          <Text category="s1" style={styles.title}>Audit Details</Text>
          <Text appearance="hint">This is a placeholder for the audit detail screen.</Text>
          <View style={styles.actions}>
            <Button status="primary" style={styles.button}>Go to Summary</Button>
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
  button: { minWidth: 160 },
});
