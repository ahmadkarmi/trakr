import { Stack } from 'expo-router';

export default function DashboardLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auditor" />
      <Stack.Screen name="branch-manager" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
