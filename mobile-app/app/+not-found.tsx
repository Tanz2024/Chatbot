import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack, Link } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Pressable style={styles.button}>
          <Link href="/" style={styles.linkText}>
            <Text style={styles.linkText}>Go to home screen!</Text>
          </Link>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  linkText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
