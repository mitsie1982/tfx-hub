import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { createMembersRootRoute, MembersRoute, MembersTabKey } from './navigation';
import AssociationOverviewScreen from './screens/AssociationOverviewScreen';
import ProfessionalDetailScreen from './screens/ProfessionalDetailScreen';
import ProfessionalsScreen from './screens/ProfessionalsScreen';
import { createAssociationActionReview, createProfessionalActionReview } from './actionReview';
import { fetchAssociationMobileOverview, fetchProfessionalMobileProfile, fetchProfessionalOperationalRequests, performAssociationOperationalAction, performProfessionalOperationalAction } from './services/membersData';
import { styles } from './styles';

const navItems: Array<{ key: MembersTabKey; label: string }> = [
  { key: 'association', label: 'Association' },
  { key: 'professionals', label: 'Professionals' }
];

const SAMPLE_PROFESSIONALS = [
  { id: 'pro-001', name: 'John Smit', trade: 'plumber', tier: 'PREMIUM', rating: 4.8 },
  { id: 'pro-002', name: 'Sarah Khubone', trade: 'builder', tier: 'TRUSTED', rating: 4.6 },
  { id: 'pro-101', name: 'Lerato Ndlovu', trade: 'electrician', tier: 'VERIFIED', rating: 4.6 }
];

export default function MembersHome() {
  const [activeTab, setActiveTab] = useState<MembersTabKey>('association');
  const [routeStack, setRouteStack] = useState<MembersRoute[]>([{ key: 'association' }]);
  const [overviewState, setOverviewState] = useState({ overview: null as any, source: 'sample' as 'live' | 'sample', warning: null as string | null });
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);
  const [pendingActionReview, setPendingActionReview] = useState<any | null>(null);
  const [professionalRequests, setProfessionalRequests] = useState<any[]>([]);
  const [associationActions, setAssociationActions] = useState<any[]>([]);
  const [info, setInfo] = useState<string | null>('Members mobile shell now stages association and professional actions for review before submit.');
  const [detailWarning, setDetailWarning] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadOverview() {
      const nextState = await fetchAssociationMobileOverview();
      if (mounted) {
        setOverviewState(nextState);
      }
    }
    loadOverview();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleOpenProfessional(professionalId: string) {
    const profile = await fetchProfessionalMobileProfile(professionalId);
    const requests = await fetchProfessionalOperationalRequests(professionalId);
    setSelectedProfessional(profile.item || SAMPLE_PROFESSIONALS.find((item) => item.id === professionalId) || null);
    setPendingActionReview(null);
    setProfessionalRequests(requests.items || []);
    setAssociationActions([]);
    setDetailWarning(profile.warning || requests.warning || null);
    setActiveTab('professionals');
    setRouteStack((current) => [...current, { key: 'professionalDetail', professionalId }]);
  }

  async function handleAssociationAction(actionType: 'member-review' | 'trade-outreach') {
    setPendingActionReview(createAssociationActionReview(selectedProfessional, actionType));
  }

  async function handleProfessionalAction(actionType: 'availability-check-in' | 'tier-review-request') {
    setPendingActionReview(createProfessionalActionReview(selectedProfessional, actionType));
  }

  async function handleConfirmActionReview() {
    if (!selectedProfessional || !pendingActionReview) {
      return;
    }

    let result;
    if (pendingActionReview.scope === 'association') {
      result = await performAssociationOperationalAction(selectedProfessional.id, pendingActionReview.actionType);
      setAssociationActions((current) => [result.item, ...current]);
    } else {
      result = await performProfessionalOperationalAction(pendingActionReview.actionType, selectedProfessional.id);
      setProfessionalRequests((current) => [result.item, ...current]);
    }

    setPendingActionReview(null);
    setInfo(result.warning || result.item.summary);
  }

  function handleCancelActionReview() {
    setPendingActionReview(null);
    setInfo('Action review cancelled. Choose another workflow when ready.');
  }

  function handleSelectTab(tab: MembersTabKey) {
    setActiveTab(tab);
    setPendingActionReview(null);
    setRouteStack([createMembersRootRoute(tab)]);
  }

  function handleGoBack() {
    setPendingActionReview(null);
    setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current);
  }

  const totals = overviewState.overview?.totals || { openJobs: 0, inProgressJobs: 0, completedJobs: 0, professionals: SAMPLE_PROFESSIONALS.length };
  const currentRoute = routeStack[routeStack.length - 1] || createMembersRootRoute(activeTab);
  const routeLabel = currentRoute.key === 'professionalDetail' ? `Professionals / ${selectedProfessional?.name || currentRoute.professionalId}` : navItems.find((item) => item.key === activeTab)?.label || 'Association';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Members workspace</Text>
          <Text style={styles.title}>Association and professional operations</Text>
          <Text style={styles.subtitle}>{overviewState.source === 'live' ? 'Live members workspace connected' : 'Sample members workspace data'}</Text>
          {overviewState.warning ? <Text style={styles.warningBanner}>{overviewState.warning}</Text> : null}
          {info ? <Text style={styles.infoBanner}>{info}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.openJobs}</Text><Text style={styles.statLabel}>Open jobs</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.professionals}</Text><Text style={styles.statLabel}>Professionals</Text></View>
          </View>
        </View>

        <View style={styles.tabBar}>
          {navItems.map((item) => (
            <Pressable key={item.key} onPress={() => handleSelectTab(item.key)} style={[styles.tabButton, activeTab === item.key && styles.tabButtonActive]}>
              <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.routeBanner}>
          <Text style={styles.routeText}>Route: {routeLabel}</Text>
          {currentRoute.key === 'professionalDetail' ? <Pressable onPress={handleGoBack}><Text style={styles.routeActionText}>Back</Text></Pressable> : null}
        </View>

        {currentRoute.key === 'association' ? <AssociationOverviewScreen overview={overviewState.overview} /> : null}
        {currentRoute.key === 'professionals' ? <ProfessionalsScreen professionals={SAMPLE_PROFESSIONALS} onOpenProfessional={handleOpenProfessional} /> : null}
        {currentRoute.key === 'professionalDetail' ? (
          <ProfessionalDetailScreen
            professional={selectedProfessional}
            associationActions={associationActions}
            pendingActionReview={pendingActionReview}
            professionalRequests={professionalRequests}
            warning={detailWarning}
            onBack={handleGoBack}
            onAssociationAction={handleAssociationAction}
            onCancelActionReview={handleCancelActionReview}
            onConfirmActionReview={handleConfirmActionReview}
            onProfessionalAction={handleProfessionalAction}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
