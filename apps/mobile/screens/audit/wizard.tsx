import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layout, Text, Button, Card } from '@ui-kitten/components';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi, Audit, Survey, AuditStatus } from '@trakr/shared';
import DashboardHeader from '../../src/components/DashboardHeader';

type RouteParams = { auditId?: string };

export default function AuditWizard() {
  const route = useRoute();
  const navigation = useNavigation();
  const { auditId } = (route.params || {}) as RouteParams;
  const queryClient = useQueryClient();

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

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [naReasons, setNaReasons] = useState<Record<string, string>>({});

  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);

  const currentSection = useMemo(() => survey?.sections?.[sectionIndex], [survey, sectionIndex]);
  const currentQuestion = useMemo(() => currentSection?.questions?.[questionIndex], [currentSection, questionIndex]);

  // Sync initial answers after audit load
  React.useEffect(() => {
    if (audit) {
      setResponses(audit.responses || {});
    }
  }, [audit]);

  const saveProgress = useMutation({
    mutationFn: async (payload: { responses: Record<string, string>; naReasons: Record<string, string> }) => {
      if (!auditId) return null as any;
      return mockApi.saveAuditProgress(auditId, payload);
    },
    onSuccess: () => {
      if (auditId) {
        queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
        queryClient.invalidateQueries({ queryKey: ['audits'] });
      }
    },
  });

  const setAnswer = (questionId: string, value: 'yes' | 'no' | 'na') => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
    if (value !== 'na') {
      setNaReasons(prev => {
        const clone = { ...prev };
        delete clone[questionId];
        return clone;
      });
    }
  };

  const goNext = async () => {
    // Persist current progress before advancing
    if (auditId) {
      await saveProgress.mutateAsync({ responses, naReasons });
    }
    const qCount = currentSection?.questions?.length || 0;
    if (questionIndex + 1 < qCount) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    const sCount = survey?.sections?.length || 0;
    if (sectionIndex + 1 < sCount) {
      setSectionIndex(sectionIndex + 1);
      setQuestionIndex(0);
      return;
    }
    // Completed
    // @ts-ignore
    navigation.navigate('AuditSummary', { auditId });
  };

  const goPrev = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      return;
    }
    if (sectionIndex > 0) {
      const prevSectionIndex = sectionIndex - 1;
      const prevQCount = survey?.sections?.[prevSectionIndex]?.questions?.length || 1;
      setSectionIndex(prevSectionIndex);
      setQuestionIndex(prevQCount - 1);
    }
  };

  if (loadingAudit || loadingSurvey) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Wizard" />
        <View style={styles.content}>
          <Text appearance="hint">Loading audit…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!audit || !survey) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader title="Audit Wizard" />
        <View style={styles.content}>
          <Text appearance="hint">Audit or Survey not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader title="Audit Wizard" />
      <View style={styles.content}>
        <Card style={{ marginBottom: 12 }}>
          <Text category="s1">{survey.title}</Text>
          <Text appearance="hint">Section {sectionIndex + 1} of {survey.sections.length}</Text>
        </Card>

        <Card>
          <Text category="s1" style={styles.title}>{currentSection?.title}</Text>
          <Text category="p2" appearance="hint" style={{ marginBottom: 12 }}>{currentSection?.description}</Text>

          <View style={{ marginBottom: 16 }}>
            <Text category="s2" style={{ marginBottom: 8 }}>
              {`Q${questionIndex + 1}. ${currentQuestion ? currentQuestion.text : ''}`}
            </Text>

            <View style={styles.answerRow}>
              <Button
                size="small"
                appearance={responses[currentQuestion!.id] === 'yes' ? 'filled' : 'outline'}
                status="primary"
                style={styles.answerBtn}
                onPress={() => setAnswer(currentQuestion!.id, 'yes')}
              >
                Yes
              </Button>
              <Button
                size="small"
                appearance={responses[currentQuestion!.id] === 'no' ? 'filled' : 'outline'}
                status="danger"
                style={styles.answerBtn}
                onPress={() => setAnswer(currentQuestion!.id, 'no')}
              >
                No
              </Button>
              <Button
                size="small"
                appearance={responses[currentQuestion!.id] === 'na' ? 'filled' : 'outline'}
                status="basic"
                style={styles.answerBtn}
                onPress={() => setAnswer(currentQuestion!.id, 'na')}
              >
                N/A
              </Button>
            </View>

            {responses[currentQuestion!.id] === 'na' && (
              <View style={{ marginTop: 12 }}>
                <Text category="c1" appearance="hint" style={{ marginBottom: 6 }}>Please provide a reason (optional):</Text>
                <TextInput
                  style={styles.input}
                  value={naReasons[currentQuestion!.id] || ''}
                  onChangeText={(t) => setNaReasons(prev => ({ ...prev, [currentQuestion!.id]: t }))}
                  placeholder="Reason for N/A"
                />
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button appearance="ghost" onPress={goPrev} style={styles.ghostBtn}>
              Previous
            </Button>
            <Button status="primary" onPress={goNext} style={styles.button}>
              {sectionIndex === survey.sections.length - 1 && questionIndex === (currentSection?.questions.length || 1) - 1 ? 'Finish' : 'Next'}
            </Button>
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  title: { marginBottom: 4 },
  actions: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { minWidth: 120 },
  ghostBtn: { minWidth: 120 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBtn: { marginRight: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
});
