import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = { title: string; onPress?: () => void; style?: any; };

export default function Button({ title, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#0b5cff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '600' }
});
