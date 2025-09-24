import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card } from '@ui-kitten/components';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mockApi, Audit, Survey, QuestionType } from '@trakr/shared';
import DashboardHeader from '../../src/components/DashboardHeader';
import * as ImagePicker from 'expo-image-picker';

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
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});

  const [sectionIndex, setSectionIndex] = useState(0);
  const [showUnansweredOnly, setShowUnansweredOnly] = useState(false);
  const [sectionDocsOpen, setSectionDocsOpen] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const questionPositionsRef = useRef<Record<string, number>>({});

  const currentSection = useMemo(() => survey?.sections?.[sectionIndex], [survey, sectionIndex]);

  const SECTION_PHOTO_LIMIT = 10;
  const currentSectionPhotosCount = useMemo(() => {
    if (!audit || !currentSection) return 0;
    return (audit.sectionPhotos || []).filter(p => p.sectionId === currentSection.id).length;
  }, [audit, currentSection]);
  const remainingSectionPhotoSlots = Math.max(0, SECTION_PHOTO_LIMIT - currentSectionPhotosCount);

  const requiredNaMissingIds = useMemo(() => {
    const sec = currentSection;
    if (!sec) return [] as string[];
    const missing: string[] = [];
    for (const q of sec.questions) {
      if (q.isWeighted && q.type === QuestionType.YES_NO && responses[q.id] === 'na') {
        const reason = (naReasons[q.id] || '').trim();
        if (!reason) missing.push(q.id);
      }
    }
    return missing;
  }, [currentSection, responses, naReasons]);

  const canAdvance = requiredNaMissingIds.length === 0;

  const answeredCount = useMemo(() => {
    if (!currentSection) return 0;
    return currentSection.questions.filter(q => !!responses[q.id]).length;
  }, [currentSection, responses]);

  const displayQuestions = useMemo(() => {
    const qs = currentSection?.questions || [];
    return showUnansweredOnly ? qs.filter(q => !responses[q.id]) : qs;
  }, [currentSection, showUnansweredOnly, responses]);

  const scrollToNextUnanswered = () => {
    const qs = currentSection?.questions || [];
    const target = qs.find(q => !responses[q.id]);
    if (!target) return;
    const y = questionPositionsRef.current[target.id];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

  // Sync initial answers after audit load
  React.useEffect(() => {
    if (audit) {
      setResponses(audit.responses || {});
      setSectionComments(audit.sectionComments || {});
    }
  }, [audit]);

  const saveProgress = useMutation<Audit | null, Error, { responses: Record<string, string>; naReasons: Record<string, string>; sectionComments?: Record<string, string>}>({
    mutationFn: async (payload) => {
      if (!auditId) return null;
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

  // Some platforms provide "fileName" on ImagePicker assets; typings may omit it.
  const getFilenameFromAsset = (a: ImagePicker.ImagePickerAsset): string => {
    const maybe = (a as Record<string, unknown>)['fileName'];
    return (typeof maybe === 'string' && maybe)
      ? maybe
      : (a.uri?.split('/').pop() ?? 'photo.jpg');
  };

  const addPhotosFromLibrary = async () => {
    if (!audit || !currentSection || remainingSectionPhotoSlots <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.6,
    });
    if (result.canceled) return;
    const assets = (result.assets || []).slice(0, remainingSectionPhotoSlots);
    for (const asset of assets) {
      if (!asset?.uri) continue;
      const filename = getFilenameFromAsset(asset);
      await mockApi.addSectionPhoto(audit.id, currentSection.id, {
        filename,
        url: asset.uri,
        uploadedBy: audit.assignedTo,
      });
    }
    if (auditId) {
      queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    }
  };

  const addPhotoFromCamera = async () => {
    if (!audit || !currentSection || remainingSectionPhotoSlots <= 0) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const filename = getFilenameFromAsset(asset);
    await mockApi.addSectionPhoto(audit.id, currentSection.id, {
      filename,
      url: asset.uri,
      uploadedBy: audit.assignedTo,
    });
    if (auditId) {
      queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    }
  };

  const removePhoto = async (photoId: string) => {
    if (!audit) return;
    await mockApi.removeSectionPhoto(audit.id, photoId);
    if (auditId) {
      queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    }
  };

  const goNext = async () => {
    // Persist current progress before advancing
    if (auditId) {
      await saveProgress.mutateAsync({ responses, naReasons, sectionComments });
    }
    const sCount = survey?.sections?.length || 0;
    if (sectionIndex + 1 < sCount) {
      setSectionIndex(sectionIndex + 1);
      return;
    }
    // Completed
    // @ts-expect-error React Navigation typing not configured for string route names here
    navigation.navigate('AuditSummary', { auditId });
  };

  const goPrev = () => {
    if (sectionIndex > 0) {
      setSectionIndex(sectionIndex - 1);
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

          {/* Utility bar: progress + filter */}
          <View style={styles.utilityRow}>
            <Text appearance="hint">Answered {answeredCount}/{currentSection?.questions.length || 0}</Text>
            <Button size="tiny" appearance={showUnansweredOnly ? 'filled' : 'outline'} onPress={() => setShowUnansweredOnly(v => !v)}>
              {showUnansweredOnly ? 'Showing Unanswered' : 'Show Unanswered Only'}
            </Button>
          </View>

          <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 8 }}>
          {/* All questions in this section */}
          {displayQuestions.map((q, idx) => {
            const answer = responses[q.id];
            const needsReason = q.isWeighted && q.type === QuestionType.YES_NO && answer === 'na';
            const missingReason = needsReason && !(naReasons[q.id] || '').trim();
            return (
              <View key={q.id} style={{ marginBottom: 12 }} onLayout={(e) => { questionPositionsRef.current[q.id] = e.nativeEvent.layout.y; }}>
                <View style={styles.questionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <Text category="s2" style={styles.questionText}>{`Q${idx + 1}. ${q.text}`}</Text>
                    {q.isWeighted ? (
                      <Text style={styles.badge}>Weighted</Text>
                    ) : null}
                  </View>
                  <View style={styles.answerRow}>
                    <Button
                      size="tiny"
                      appearance={answer === 'yes' ? 'filled' : 'outline'}
                      status="primary"
                      style={styles.answerBtn}
                      onPress={() => setAnswer(q.id, 'yes')}
                    >
                      Yes
                    </Button>
                    <Button
                      size="tiny"
                      appearance={answer === 'no' ? 'filled' : 'outline'}
                      status="danger"
                      style={styles.answerBtn}
                      onPress={() => setAnswer(q.id, 'no')}
                    >
                      No
                    </Button>
                    <Button
                      size="tiny"
                      appearance={answer === 'na' ? 'filled' : 'outline'}
                      status="basic"
                      style={styles.answerBtn}
                      onPress={() => setAnswer(q.id, 'na')}
                    >
                      N/A
                    </Button>
                  </View>
                </View>
                {answer === 'na' && (
                  <View style={{ marginTop: 8 }}>
                    <Text category="c1" appearance="hint" style={{ marginBottom: 6 }}>Please provide a reason {needsReason ? '(required)' : '(optional)'}:</Text>
                    <TextInput
                      style={styles.inputSmall}
                      value={naReasons[q.id] || ''}
                      onChangeText={(t) => setNaReasons(prev => ({ ...prev, [q.id]: t }))}
                      placeholder="Reason for N/A"
                    />
                    {missingReason && (
                      <Text status="danger" category="c1" style={{ marginTop: 6 }}>
                        Reason is required for N/A on weighted questions.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          {/* Section documentation: photos and additional comments */}
          <View style={{ marginTop: 12 }}>
            <View style={styles.utilityRow}>
              <Text category="s2">Section Notes & Photos</Text>
              <Button size="tiny" appearance="ghost" onPress={() => setSectionDocsOpen(o => !o)}>
                {sectionDocsOpen ? 'Hide' : 'Show'}
              </Button>
            </View>
            {sectionDocsOpen && (
              <View>
                <Text category="c1" appearance="hint" style={{ marginBottom: 8 }}>
                  Attach photos and add optional comments for this section.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {audit.sectionPhotos?.filter(p => p.sectionId === currentSection?.id).map((p) => (
                    <View key={p.id} style={{ marginRight: 8, marginBottom: 8, alignItems: 'center' }}>
                      <Image source={{ uri: p.url }} style={styles.photoThumb} />
                      <Button size="tiny" appearance="ghost" status="danger" onPress={() => removePhoto(p.id)}>
                        Remove
                      </Button>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <Button size="small" appearance="outline" onPress={addPhotosFromLibrary} disabled={remainingSectionPhotoSlots <= 0}>
                    Add from Library
                  </Button>
                  <Button size="small" appearance="outline" onPress={addPhotoFromCamera} disabled={remainingSectionPhotoSlots <= 0}>
                    Use Camera
                  </Button>
                  <Text appearance="hint" category="c1">{`${currentSectionPhotosCount}/${SECTION_PHOTO_LIMIT}`} photos</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={sectionComments[currentSection!.id] || ''}
                  onChangeText={(t) => setSectionComments(prev => ({ ...prev, [currentSection!.id]: t }))}
                  placeholder="Additional comments for this section (optional)"
                  multiline
                />
              </View>
            )}
          </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button appearance="ghost" onPress={goPrev} style={styles.ghostBtn}>
              Previous
            </Button>
            <Button appearance="outline" onPress={scrollToNextUnanswered} style={styles.ghostBtn}>
              Next Unanswered
            </Button>
            <Button status="primary" onPress={goNext} style={styles.button} disabled={!canAdvance}>
              {sectionIndex === survey.sections.length - 1 ? 'Finish' : 'Next'}
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
  utilityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  questionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  questionText: { flexShrink: 1, marginRight: 8 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBtn: { marginRight: 8 },
  badge: {
    backgroundColor: '#eef2ff',
    color: '#3730a3',
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
});
