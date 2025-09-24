import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '@ui-kitten/components';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { mockApi, Audit, Survey, AUDIT_STATUS_LABELS } from '@trakr/shared';
import DashboardHeader from '../../src/components/DashboardHeader';

type RouteParams = { auditId?: string };

export default function AuditDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { auditId } = (route.params || {}) as RouteParams;

  const { data: audit, isLoading: loadingAudit } = useQuery<Audit | null>({
    queryKey: ['audit', auditId],
    queryFn: () => (auditId ? mockApi.getAuditById(auditId) : Promise.resolve(null)),
    enabled: !!auditId,
  });

  const { data: survey, isLoading: loadingSurvey } = useQuery<Survey | null>({
    queryKey: ['survey', audit?.surveyId],
    queryFn: () => (audit?.surveyId ? mockApi.getSurveyById(audit!.surveyId) : Promise.resolve(null)),
    enabled: !!audit?.surveyId,
  });

  if (loadingAudit || loadingSurvey) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Detail" />
        <View style={styles.content}>
          <Text appearance="hint">Loading audit…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!audit || !survey) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Detail" />
        <View style={styles.content}>
          <Text appearance="hint">Audit or Survey not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Detail" />
      <View style={styles.content}>
        <Card style={{ marginBottom: 12 }}>
          <Text category="s1">{`Audit ${audit.id}`}</Text>
          <Text appearance="hint">{`Status: ${AUDIT_STATUS_LABELS[audit.status]}`}</Text>
        </Card>

        {survey.sections.map((section) => (
          <Card key={section.id} style={{ marginBottom: 12 }}>
            <Text category="s1" style={styles.title}>{section.title}</Text>
            {section.questions.map((q) => {
              const ans = audit.responses[q.id];
              const reason = audit.naReasons[q.id];
              return (
                <View key={q.id} style={{ marginBottom: 8 }}>
                  <Text category="s2">{q.text}</Text>
                  <Text appearance="hint">{`Answer: ${ans ?? '—'}`}</Text>
                  {ans === 'na' && !!reason && (
                    <Text appearance="hint">{`Reason: ${reason}`}</Text>
                  )}
                </View>
              );
            })}
          </Card>
        ))}

        <View style={styles.actions}>
          <Button
            status="primary"
            style={styles.button}
            onPress={() => {
              // @ts-expect-error React Navigation typing not configured for string route names here
              navigation.navigate('AuditSummary', { auditId });
            }}
          >
            Go to Summary
          </Button>
        </View>
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
