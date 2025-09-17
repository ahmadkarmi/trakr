import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function Index() {
  console.log('Index Screen - Platform:', Platform.OS);
  console.log('Index Screen - Rendering simple test...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trakr Mobile App</Text>
      <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
      <Text style={styles.subtitle}>Test Screen - App is Working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
});
