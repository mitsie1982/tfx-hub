import React, { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import SurveyModal from "./SurveyModal";
import CheckInForm from "./CheckInForm";
const { getHumanFacingDemoSeed } = require("@tfx/shared-logic");
import { createMembersRootRoute, MembersRoute, MembersTabKey } from "./navigation";
import AssociationOverviewScreen from "./screens/AssociationOverviewScreen";
import ProfessionalDetailScreen from "./screens/ProfessionalDetailScreen";
import ProfessionalsScreen from "./screens/ProfessionalsScreen";
import { createAssociationActionReview, createProfessionalActionReview } from "./actionReview";
import {
  fetchAssociationMobileOverview,
  fetchProfessionalMobileProfile,
  fetchProfessionalOperationalRequests,
  performAssociationOperationalAction,
  performProfessionalOperationalAction,
} from "./services/membersData";
import { styles } from "./styles";

const navItems: Array<{ key: MembersTabKey; label: string }> = [
  { key: "association", label: "Association Member Management System (AMMS)" },
  { key: "professionals", label: "Professionals" },
];

const SAMPLE_PROFESSIONALS = getHumanFacingDemoSeed().members.professionals;

// Helper to check if a week has passed since last check-in
function shouldShowWeeklyCheckIn() {
  const lastCheckIn = localStorage.getItem("lastCheckIn");
  if (!lastCheckIn) return true;
  const last = new Date(lastCheckIn);
  const now = new Date();
  const diff = now.getTime() - last.getTime();
  return diff > 1000 * 60 * 60 * 24 * 7; // 7 days
}

export default function MembersHome() {
  const [activeTab, setActiveTab] = useState<MembersTabKey>("association");
  const [routeStack, setRouteStack] = useState<MembersRoute[]>([{ key: "association" }]);
  const [overviewState, setOverviewState] = useState({
    overview: null as any,
    source: "sample" as "live" | "sample",
    warning: null as string | null,
  });
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);
  const [pendingActionReview, setPendingActionReview] = useState<any | null>(null);
  const [professionalRequests, setProfessionalRequests] = useState<any[]>([]);
  const [associationActions, setAssociationActions] = useState<any[]>([]);
  const [info, setInfo] = useState<string | null>(
    "Members mobile shell now stages association and professional actions for review before submit.",
  );
  const [showSurvey, setShowSurvey] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(shouldShowWeeklyCheckIn());
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
    setActiveTab("professionals");
    setRouteStack((current) => [...current, { key: "professionalDetail", professionalId }]);
  }

  async function handleAssociationAction(actionType: "member-review" | "trade-outreach") {
    setPendingActionReview(createAssociationActionReview(selectedProfessional, actionType));
  }

  async function handleProfessionalAction(actionType: "availability-check-in" | "tier-review-request") {
    setPendingActionReview(createProfessionalActionReview(selectedProfessional, actionType));
  }

  // Simulate job completion: show survey after confirming action review for completed jobs
  async function handleConfirmActionReview() {
    if (!selectedProfessional || !pendingActionReview) {
      return;
    }

    let result;
    if (pendingActionReview.scope === "association") {
      result = await performAssociationOperationalAction(selectedProfessional.id, pendingActionReview.actionType);
      setAssociationActions((current) => [result.item, ...current]);
    } else {
      result = await performProfessionalOperationalAction(pendingActionReview.actionType, selectedProfessional.id);
      setProfessionalRequests((current) => [result.item, ...current]);
    }

    setPendingActionReview(null);
    setInfo(result.warning || result.item.summary);
    // If the action was a job closure, trigger the survey modal
    if (pendingActionReview && pendingActionReview.actionType === "job-closure") {
      setShowSurvey(true);
    }
    // Handler for survey submission
    function handleSurveySubmit(feedback) {
      // TODO: Send feedback to backend or store locally
      setInfo("Thank you for your feedback!");
      setShowSurvey(false);
    }

    // Handler for weekly check-in submission
    function handleCheckInSubmit(notes) {
      // TODO: Send check-in notes to backend or store locally
      setInfo("Weekly check-in submitted!");
      setShowCheckIn(false);
      localStorage.setItem("lastCheckIn", new Date().toISOString());
    }
  }

  function handleCancelActionReview() {
    setPendingActionReview(null);
    setInfo("Action review cancelled. Choose another workflow when ready.");
  }

  function handleSelectTab(tab: MembersTabKey) {
    setActiveTab(tab);
    setPendingActionReview(null);
    setRouteStack([createMembersRootRoute(tab)]);
  }

  function handleGoBack() {
    setPendingActionReview(null);
    setRouteStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  const totals = overviewState.overview?.totals || {
    openJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    professionals: SAMPLE_PROFESSIONALS.length,
  };
  const currentRoute = routeStack[routeStack.length - 1] || createMembersRootRoute(activeTab);
  const routeLabel =
    currentRoute.key === "professionalDetail"
      ? `Professionals / ${selectedProfessional?.name || currentRoute.professionalId}`
      : navItems.find((item) => item.key === activeTab)?.label || "Association Member Management System (AMMS)";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Members workspace</Text>
          <Text style={styles.title}>Association and professional operations</Text>
          <Text style={styles.subtitle}>
            {overviewState.source === "live" ? "Live members workspace connected" : "Sample members workspace data"}
          </Text>
          {overviewState.warning ? <Text style={styles.warningBanner}>{overviewState.warning}</Text> : null}
          {info ? <Text style={styles.infoBanner}>{info}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.openJobs}</Text>
              <Text style={styles.statLabel}>Open jobs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totals.professionals}</Text>
              <Text style={styles.statLabel}>Professionals</Text>
            </View>
          </View>
        </View>

        {/* Weekly Check-In Prompt */}
        {showCheckIn && <CheckInForm onSubmit={handleCheckInSubmit} />}

        <View style={styles.tabBar}>
          {navItems.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => handleSelectTab(item.key)}
              style={[styles.tabButton, activeTab === item.key && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.routeBanner}>
          <Text style={styles.routeText}>Route: {routeLabel}</Text>
          {currentRoute.key === "professionalDetail" ? (
            <Pressable onPress={handleGoBack}>
              <Text style={styles.routeActionText}>Back</Text>
            </Pressable>
          ) : null}
        </View>

        {currentRoute.key === "association" ? <AssociationOverviewScreen overview={overviewState.overview} /> : null}
        {currentRoute.key === "professionals" ? (
          <ProfessionalsScreen professionals={SAMPLE_PROFESSIONALS} onOpenProfessional={handleOpenProfessional} />
        ) : null}
        {currentRoute.key === "professionalDetail" ? (
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
        {/* Survey Modal for job closure feedback */}
        <SurveyModal visible={showSurvey} onClose={() => setShowSurvey(false)} onSubmit={handleSurveySubmit} />
      </ScrollView>
    </SafeAreaView>
  );
}
