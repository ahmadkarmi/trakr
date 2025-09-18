import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from '@ui-kitten/components';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi, Audit, Survey, AUDIT_STATUS_LABELS, AuditStatus } from '@trakr/shared';
import DashboardHeader from '../../src/components/DashboardHeader';

type RouteParams = { auditId?: string };

export default function AuditSummary() {
  const route = useRoute();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
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

  const stats = useMemo(() => {
    if (!audit || !survey) return null;
    const allQuestions = survey.sections.flatMap(s => s.questions);
    const total = allQuestions.length;
    const answeredYes = allQuestions.filter(q => audit.responses[q.id] === 'yes').length;
    const answeredNo = allQuestions.filter(q => audit.responses[q.id] === 'no').length;
    const answeredNA = allQuestions.filter(q => audit.responses[q.id] === 'na').length;
    const considered = answeredYes + answeredNo; // exclude N/A from compliance
    const compliance = considered > 0 ? Math.round((answeredYes / considered) * 100) : 0;
    return { total, answeredYes, answeredNo, answeredNA, compliance };
  }, [audit, survey]);

  const completeAudit = useMutation({
    mutationFn: async () => {
      if (!auditId) return null as any;
      return mockApi.setAuditStatus(auditId, AuditStatus.COMPLETED);
    },
    onSuccess: () => {
      if (auditId) {
        queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
        queryClient.invalidateQueries({ queryKey: ['audits'] });
      }
    },
  });

  if (loadingAudit || loadingSurvey) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Summary" />
        <View style={styles.content}>
          <Text appearance="hint">Loading summary…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!audit || !survey || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Summary" />
        <View style={styles.content}>
          <Text appearance="hint">Audit or Survey not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Summary" />
      <View style={styles.content}>
        <Card style={{ marginBottom: 12 }}>
          <Text category="s1">{`Audit ${audit.id}`}</Text>
          <Text appearance="hint">{`Status: ${AUDIT_STATUS_LABELS[audit.status]}`}</Text>
        </Card>

        <Card style={{ marginBottom: 12 }}>
          <Text category="s1" style={styles.title}>Results</Text>
          <Text appearance="hint">{`Total Questions: ${stats.total}`}</Text>
          <Text appearance="hint">{`Yes: ${stats.answeredYes}`}</Text>
          <Text appearance="hint">{`No: ${stats.answeredNo}`}</Text>
          <Text appearance="hint">{`N/A: ${stats.answeredNA}`}</Text>
          <Text category="s1" style={{ marginTop: 8 }}>{`Compliance: ${stats.compliance}%`}</Text>
        </Card>

        <View style={styles.actions}>
          <Button
            appearance="outline"
            style={styles.button}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('AuditDetail', { auditId });
            }}
          >
            View Details
          </Button>
          <Button
            status="primary"
            style={styles.button}
            disabled={audit.status === AuditStatus.COMPLETED}
            onPress={() => completeAudit.mutate()}
          >
            {audit.status === AuditStatus.COMPLETED ? 'Completed' : 'Mark as Completed'}
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
  actions: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { minWidth: 140 },
});
