

import React, { useState } from 'react';
import { Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { styles } from '../styles';
import axios from 'axios';

type Props = {
  contractors: any[];
  filters: { rating?: string; tier?: string; distance?: string };
  onOpenContractor: (professionalId: string) => void;
  onFilterChange: (patch: Partial<Props['filters']>) => void;
};

  const [smartMatchText, setSmartMatchText] = useState('');
  const [smartMatchResults, setSmartMatchResults] = useState<any[] | null>(null);
  const [smartMatchLoading, setSmartMatchLoading] = useState(false);
  const [smartMatchError, setSmartMatchError] = useState<string | null>(null);

  async function handleSmartMatch() {
    setSmartMatchLoading(true);
    setSmartMatchError(null);
    setSmartMatchResults(null);
    try {
      const res = await axios.post('/api/smart-match', { requestText: smartMatchText });
      setSmartMatchResults(res.data.matches || []);
    } catch (err: any) {
      setSmartMatchError(err?.response?.data?.error || err.message || 'Smart match failed');
    } finally {
      setSmartMatchLoading(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Contractor directory</Text>

      {/* Smart Match Input */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.input}
          placeholder="Describe your job request (e.g. 'I need a plumber in Sandton for a geyser repair')"
          value={smartMatchText}
          onChangeText={setSmartMatchText}
        />
        <Pressable
          style={[styles.button, smartMatchLoading && styles.buttonDisabled]}
          onPress={handleSmartMatch}
          disabled={smartMatchLoading || !smartMatchText.trim()}
        >
          <Text style={styles.buttonText}>{smartMatchLoading ? 'Matching...' : 'Smart Match'}</Text>
        </Pressable>
      </View>
      {smartMatchError ? <Text style={styles.errorText}>{smartMatchError}</Text> : null}

      {/* Contractor Filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.input}
          placeholder="Min rating"
          value={filters.rating || ''}
          onChangeText={(value) => onFilterChange({ rating: value })}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Tier (e.g. PREMIUM)"
          value={filters.tier || ''}
          onChangeText={(value) => onFilterChange({ tier: value })}
        />
        <TextInput
          style={styles.input}
          placeholder="Max distance (km)"
          value={filters.distance || ''}
          onChangeText={(value) => onFilterChange({ distance: value })}
          keyboardType="numeric"
        />
      </View>

      {/* Smart Match Results */}
      {smartMatchLoading ? <ActivityIndicator size="small" color="#007AFF" /> : null}
      {smartMatchResults && (
        <View style={styles.resultsCard}>
          <Text style={styles.sectionSubtitle}>Smart Match Results</Text>
          {smartMatchResults.length === 0 ? (
            <Text style={styles.listHint}>No matches found for your request.</Text>
          ) : (
            smartMatchResults.map((contractor) => (
              <Pressable key={contractor.id} onPress={() => onOpenContractor(contractor.id)} style={styles.listCard}>
                <Text style={styles.listTitle}>{contractor.name || contractor.id}</Text>
                <Text style={styles.listMeta}>{contractor.trade} · {contractor.tier} · {contractor.rating || 'N/A'}★</Text>
                <Text style={styles.listHint}>Open contractor detail</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      {/* Default Contractor List (if no smart match results) */}
      {!smartMatchResults && contractors.map((contractor) => (
        <Pressable key={contractor.id} onPress={() => onOpenContractor(contractor.id)} style={styles.listCard}>
          <Text style={styles.listTitle}>{contractor.name || contractor.id}</Text>
          <Text style={styles.listMeta}>{contractor.trade} · {contractor.tier} · {contractor.rating || 'N/A'}★</Text>
          <Text style={styles.listHint}>Open contractor detail</Text>
        </Pressable>
      ))}
    </View>
  );
}