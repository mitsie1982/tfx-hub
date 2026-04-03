import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ContractorProject } from '../types';

type Props = {
  projects: ContractorProject[];
  selectedProjectId: string | null;
  searchText: string;
  activeTrade: string;
  warning: string | null;
  onSelectProject: (projectId: string) => void;
  onSearchTextChange: (value: string) => void;
  onTradeChange: (trade: string) => void;
  onOpenDetails: (projectId: string) => void;
};

const tradeFilters = ['All', 'Plumbing', 'Electrical', 'Roofing', 'Solar'];

export default function BrowseProjectsScreen({
  projects,
  selectedProjectId,
  searchText,
  activeTrade,
  warning,
  onSelectProject,
  onSearchTextChange,
  onTradeChange,
  onOpenDetails
}: Props) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available projects</Text>
        <Text style={styles.sectionMeta}>{projects.length} matched leads</Text>
      </View>

      {warning ? <Text style={styles.warningBanner}>{warning}</Text> : null}

      <TextInput
        value={searchText}
        onChangeText={onSearchTextChange}
        placeholder="Search by project, suburb, or scope"
        placeholderTextColor="#6b7280"
        style={styles.searchInput}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {tradeFilters.map((trade) => {
          const isActive = trade === activeTrade;
          return (
            <Pressable
              key={trade}
              onPress={() => onTradeChange(trade)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{trade}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.projectList}>
        {projects.map((project) => {
          const isSelected = project.id === selectedProjectId;

          return (
            <Pressable
              key={project.id}
              onPress={() => onSelectProject(project.id)}
              style={[styles.projectCard, isSelected && styles.projectCardSelected]}
            >
              <View style={styles.projectCardHeader}>
                <Text style={styles.projectTrade}>{project.trade}</Text>
                <Text style={styles.projectScore}>{project.matchScore}% match</Text>
              </View>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectMeta}>{project.location} · {project.budget}</Text>
              <Text style={styles.projectMeta}>{project.urgency} · {project.posted} · {project.leadType}</Text>
              <Text numberOfLines={2} style={styles.projectDescription}>{project.description}</Text>
              <View style={styles.projectCardFooter}>
                <Text style={styles.statusPill}>{project.source === 'live' ? 'Live lead' : 'Sample lead'}</Text>
                <Pressable onPress={() => onOpenDetails(project.id)}>
                  <Text style={styles.tapHint}>Open detail</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No projects match this search</Text>
            <Text style={styles.emptyStateText}>Try another trade filter or search term.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12
  },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#18231c' },
  sectionMeta: { fontSize: 13, color: '#516056' },
  warningBanner: {
    backgroundColor: '#fff3cd',
    borderColor: '#f1d28a',
    borderWidth: 1,
    color: '#8b5e34',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden'
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d8ddd6'
  },
  filterRow: { paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e4e0d6',
    marginRight: 8
  },
  filterChipActive: { backgroundColor: '#123524' },
  filterChipText: { color: '#324138', fontWeight: '600' },
  filterChipTextActive: { color: '#ffffff' },
  projectList: { marginTop: 8, marginBottom: 20 },
  projectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e4dfd5'
  },
  projectCardSelected: { borderColor: '#123524', borderWidth: 2 },
  projectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  projectTrade: { color: '#123524', fontSize: 13, fontWeight: '700' },
  projectScore: { color: '#e76f51', fontSize: 13, fontWeight: '700' },
  projectTitle: { color: '#18231c', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  projectMeta: { color: '#5a695f', fontSize: 13, marginBottom: 4 },
  projectDescription: { color: '#36433b', fontSize: 14, lineHeight: 20, marginTop: 6 },
  projectCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  statusPill: {
    color: '#123524',
    backgroundColor: '#d8ebdd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700'
  },
  tapHint: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center'
  },
  emptyStateTitle: { color: '#18231c', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyStateText: { color: '#5f6d64', fontSize: 14 }
});