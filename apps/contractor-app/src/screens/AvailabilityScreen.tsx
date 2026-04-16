import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TextInput, StyleSheet } from 'react-native';
import { fetchAvailability, createAvailability, updateAvailability } from '../services/contractorData';

export default function AvailabilityScreen() {
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAvailability();
      setSlots(result.items || []);
    } catch (e) {
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, []);

  const handleAddSlot = async () => {
    if (!startTime || !endTime) return;
    setLoading(true);
    try {
      await createAvailability({ startTime, endTime });
      setStartTime('');
      setEndTime('');
      loadSlots();
    } catch (e) {
      setError('Failed to add slot');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnavailable = async (id) => {
    setLoading(true);
    try {
      await updateAvailability(id, { status: 'unavailable' });
      loadSlots();
    } catch (e) {
      setError('Failed to update slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Availability</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Start Time (ISO)"
          value={startTime}
          onChangeText={setStartTime}
        />
        <TextInput
          style={styles.input}
          placeholder="End Time (ISO)"
          value={endTime}
          onChangeText={setEndTime}
        />
        <Button title="Add" onPress={handleAddSlot} disabled={loading} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={slots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.slotRow}>
            <Text>{item.start_time} - {item.end_time} ({item.status})</Text>
            {item.status === 'available' && (
              <Button title="Mark Unavailable" onPress={() => handleMarkUnavailable(item.id)} />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  inputRow: { flexDirection: 'row', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginRight: 8, flex: 1 },
  error: { color: 'red', marginBottom: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
});
