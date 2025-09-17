import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function App() {
  console.log('App.js - Platform:', Platform.OS);
  console.log('App.js - Rendering...');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trakr Mobile App</Text>
      <Text style={styles.subtitle}>Platform: {Platform.OS}</Text>
      <Text style={styles.subtitle}>Simple App - Working!</Text>
      <Text style={styles.description}>
        This is a basic React Native Web test without Expo Router
      </Text>
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
  description: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
});
