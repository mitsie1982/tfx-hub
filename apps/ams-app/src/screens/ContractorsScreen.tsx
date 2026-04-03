import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  contractors: any[];
  onOpenContractor: (professionalId: string) => void;
};

export default function ContractorsScreen({ contractors, onOpenContractor }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Contractor directory</Text>
      {contractors.map((contractor) => (
        <Pressable key={contractor.id} onPress={() => onOpenContractor(contractor.id)} style={styles.listCard}>
          <Text style={styles.listTitle}>{contractor.name || contractor.id}</Text>
          <Text style={styles.listMeta}>{contractor.trade} · {contractor.tier} · {contractor.rating || 'N/A'}★</Text>
          <Text style={styles.listHint}>Open contractor detail</Text>
        </Pressable>
      ))}
    </View>
  );
}