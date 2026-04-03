import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styles } from '../styles';

type Props = {
  professionals: any[];
  onOpenProfessional: (professionalId: string) => void;
};

export default function ProfessionalsScreen({ professionals, onOpenProfessional }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Professional Directory</Text>
      <Text style={styles.subheading}>Open any professional record to run the new operational workflows from the members mobile shell.</Text>
      {professionals.map((professional) => (
        <Pressable key={professional.id} onPress={() => onOpenProfessional(professional.id)} style={styles.listCard}>
          <Text style={styles.listTitle}>{professional.name}</Text>
          <Text style={styles.listMeta}>{professional.trade} · {professional.tier || 'ONBOARDED'} · {professional.rating || 'N/A'} rating</Text>
          <Text style={styles.listHint}>Open profile and actions</Text>
        </Pressable>
      ))}
    </View>
  );
}