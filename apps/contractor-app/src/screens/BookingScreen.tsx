import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { fetchContractors, fetchAvailability, createBooking } from '../services/clientData';

export default function BookingScreen() {
  const [contractors, setContractors] = useState([]);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadContractors() {
      setLoading(true);
      try {
        const result = await fetchContractors();
        setContractors(result.items || []);
      } catch (e) {
        setError('Failed to load contractors');
      } finally {
        setLoading(false);
      }
    }
    loadContractors();
  }, []);

  const handleSelectContractor = async (contractor) => {
    setSelectedContractor(contractor);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAvailability(contractor.id);
      setSlots(result.items || []);
    } catch (e) {
      setError('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (slot) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createBooking({ contractorId: selectedContractor.id, availabilityId: slot.id });
      setSuccess('Booking requested!');
    } catch (e) {
      setError('Failed to book slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Book a Contractor</Text>
      <FlatList
        data={contractors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Button title={item.name} onPress={() => handleSelectContractor(item)} />
        )}
      />
      {selectedContractor && (
        <View style={styles.slotsSection}>
          <Text style={styles.subtitle}>Available Slots for {selectedContractor.name}</Text>
          <FlatList
            data={slots.filter((s) => s.status === 'available')}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.slotRow}>
                <Text>{item.start_time} - {item.end_time}</Text>
                <Button title="Book" onPress={() => handleBook(item)} />
              </View>
            )}
          />
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  slotsSection: { marginTop: 16 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
  error: { color: 'red', marginTop: 8 },
  success: { color: 'green', marginTop: 8 },
});
