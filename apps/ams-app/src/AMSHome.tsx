import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { AdminRoute, AdminTabKey, createAdminRootRoute } from './navigation';
import AuthScreen from './screens/AuthScreen';
import AdminManagementScreen from './screens/AdminManagementScreen';
import ContractorDetailScreen from './screens/ContractorDetailScreen';
import ContractorsScreen from './screens/ContractorsScreen';
import OverviewScreen from './screens/OverviewScreen';
import { createAdminActionReview } from './actionReview';
import { createManagedAdminAccount, fetchAdminContractorDetail, fetchAdminManagement, fetchAdminOverview, loginAdmin, logoutAdmin, performAdminContractorAction, requestManagedAdminPasswordReset, restoreAdminSession, rotateManagedAdminCredentials } from './services/amsData';
import { styles } from './styles';

export default function AMSHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [credentials, setCredentials] = useState({
    identifier: (process && process.env && process.env.TFX_ADMIN_USERNAME) || 'set-admin-username',
    password: (process && process.env && process.env.TFX_ADMIN_PASSWORD) || 'set-admin-password'
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>('Sign in with the secret admin username and admin password. Admin WhatsApp access is disabled and admin access is limited to 08:00-17:00 Africa/Johannesburg.');
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
  const [routeStack, setRouteStack] = useState<AdminRoute[]>([{ key: 'overview' }]);
  const [state, setState] = useState({ overview: null as any, contractors: [] as any[], source: 'sample' as 'live' | 'sample', warning: null as string | null });
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
  const [pendingActionReview, setPendingActionReview] = useState<any | null>(null);
  const [detailWarning, setDetailWarning] = useState<string | null>(null);
  const [adminManagement, setAdminManagement] = useState({ accounts: [] as any[], auditEvents: [] as any[], source: 'sample' as 'live' | 'sample', warning: null as string | null, csvPreview: null as string | null });
  const [adminDraft, setAdminDraft] = useState({ firstName: 'Ops', lastName: 'Admin', email: 'ops-admin@example.com', username: 'ops.admin', password: 'change-me-now' });
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);
  const [adminFilters, setAdminFilters] = useState<{ outcome: 'all' | 'success' | 'denied' }>({ outcome: 'all' });
  // New: contractor search filters
  const [contractorFilters, setContractorFilters] = useState<{ rating?: string; tier?: string; distance?: string }>({});

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      const session = await restoreAdminSession();
      if (!mounted) {
        return;
      }
      setIsAuthenticated(session.authenticated);
      setAuthInfo(session.warning || (session.authenticated ? null : 'Sign in with the secret admin username and admin password. Admin WhatsApp access is disabled and admin access is limited to 08:00-17:00 Africa/Johannesburg.'));
      setIsRestoringSession(false);
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;
    async function loadData() {
      // Pass contractorFilters to fetchAdminOverview if supported
      const [nextState, nextAdminManagement] = await Promise.all([
        fetchAdminOverview(contractorFilters),
        fetchAdminManagement(adminFilters)
      ]);
      if (mounted) {
        setState(nextState);
        setAdminManagement(nextAdminManagement);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [adminFilters, contractorFilters, isAuthenticated]);

  async function handleLogin() {
    setAuthError(null);
    try {
      await loginAdmin(credentials);
      setIsAuthenticated(true);
      setAuthInfo(null);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to continue.');
    }
  }

  function handleLogout() {
    void logoutAdmin();
    setIsAuthenticated(false);
    setActiveTab('overview');
    setRouteStack([createAdminRootRoute('overview')]);
    setAdminActionMessage(null);
    setAuthInfo('Signed out. Sign in again with the secret admin username and admin password during 08:00-17:00 Africa/Johannesburg.');
  }

  async function handleOpenContractor(professionalId: string) {
    const result = await fetchAdminContractorDetail(professionalId);
    setSelectedContractor(result.item);
    setPendingActionReview(null);
    setDetailWarning(result.warning || null);
    setActiveTab('contractors');
    setRouteStack((current) => [...current, { key: 'contractorDetail', professionalId }]);
  }

  async function handleRunAdminAction(actionType: 'tier-review' | 'compliance-review' | 'dispute-audit') {
    setPendingActionReview(createAdminActionReview(selectedContractor, actionType));
  }

  async function handleConfirmAdminActionReview() {
    if (!selectedContractor || !pendingActionReview) {
      return;
    }

    const result = await performAdminContractorAction(selectedContractor.id, pendingActionReview.actionType);
    setPendingActionReview(null);
    setDetailWarning(result.warning || null);
    setSelectedContractor((current) => current ? ({ ...current, adminActions: [result.item, ...(current.adminActions || [])] }) : current);
    setAdminActionMessage(result.warning || result.item.summary);
  }

  function handleCancelAdminActionReview() {
    setPendingActionReview(null);
    setAdminActionMessage('Admin action review cancelled. Select another action when ready.');
  }

  function handleSelectTab(tab: AdminTabKey) {
    setActiveTab(tab);
    setPendingActionReview(null);
    setRouteStack([createAdminRootRoute(tab)]);
  }

  async function refreshAdminManagement(nextFilters = adminFilters) {
    const result = await fetchAdminManagement(nextFilters);
    setAdminManagement(result);
  }

  async function handleCreateManagedAdmin() {
    setAdminActionMessage(null);
    try {
      const result = await createManagedAdminAccount(adminDraft);
      setAdminActionMessage(result.warning || `Created ${result.item.username}`);
      await refreshAdminManagement();
    } catch (error) {
      setAdminActionMessage(error instanceof Error ? error.message : 'Unable to create admin account.');
    }
  }

  async function handleRequestPasswordReset(adminUserId: string) {
    setAdminActionMessage(null);
    try {
      const result = await requestManagedAdminPasswordReset(adminUserId);
      setAdminActionMessage(result.warning || `Reset token issued for ${result.item.targetUserId}`);
      await refreshAdminManagement();
    } catch (error) {
      setAdminActionMessage(error instanceof Error ? error.message : 'Unable to issue password reset.');
    }
  }

  async function handleRotateCredentials(adminUserId: string, currentUsername: string) {
    setAdminActionMessage(null);
    try {
      const nextPassword = `temp-${Date.now().toString().slice(-6)}`;
      const result = await rotateManagedAdminCredentials(adminUserId, { username: currentUsername, password: nextPassword });
      setAdminActionMessage(result.warning || `Rotated ${result.item.username}. Temporary password: ${nextPassword}`);
      await refreshAdminManagement();
    } catch (error) {
      setAdminActionMessage(error instanceof Error ? error.message : 'Unable to rotate credentials.');
    }
  }

  async function handleExportAuditPreview() {
    const result = await fetchAdminManagement(adminFilters);
    setAdminManagement(result);
    setAdminActionMessage('CSV preview refreshed from the admin audit export endpoint.');
  }

  function handleGoBack() {
    setPendingActionReview(null);
    setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current);
  }

  if (isRestoringSession) {
    return <SafeAreaView style={styles.safeArea}><Text style={styles.loadingText}>Restoring admin session...</Text></SafeAreaView>;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthScreen
          authInfo={authInfo}
          authError={authError}
          credentials={credentials}
          onCredentialsChange={(patch) => setCredentials((current) => ({ ...current, ...patch }))}
          onSubmit={handleLogin}
        />
      </SafeAreaView>
    );
  }

  const totals = state.overview ? state.overview.totals : { openJobs: 0, inProgressJobs: 0, completedJobs: 0, professionals: 0 };
  const currentRoute = routeStack[routeStack.length - 1] || createAdminRootRoute(activeTab);
  const routeLabel = currentRoute.key === 'contractorDetail'
    ? `Contractors / ${selectedContractor?.name || currentRoute.professionalId}`
    : activeTab === 'contractors'
      ? 'Contractors'
      : activeTab === 'admins'
        ? 'Admins'
        : 'Overview';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Admin workspace</Text>
          <Text style={styles.title}>Platform operations overview</Text>
          <Text style={styles.subtitle}>{state.source === 'live' ? 'Live operations data connected' : 'Sample admin workspace data'}</Text>
          {state.warning ? <Text style={styles.warningBanner}>{state.warning}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.openJobs}</Text><Text style={styles.statLabel}>Open jobs</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.inProgressJobs}</Text><Text style={styles.statLabel}>In progress</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.completedJobs}</Text><Text style={styles.statLabel}>Completed</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{totals.professionals}</Text><Text style={styles.statLabel}>Professionals</Text></View>
          </View>
        </View>

        <View style={styles.tabBar}>
          <Pressable onPress={() => handleSelectTab('overview')} style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}><Text style={[styles.tabLabel, activeTab === 'overview' && styles.tabLabelActive]}>Overview</Text></Pressable>
          <Pressable onPress={() => handleSelectTab('contractors')} style={[styles.tabButton, activeTab === 'contractors' && styles.tabButtonActive]}><Text style={[styles.tabLabel, activeTab === 'contractors' && styles.tabLabelActive]}>Contractors</Text></Pressable>
          <Pressable onPress={() => handleSelectTab('admins')} style={[styles.tabButton, activeTab === 'admins' && styles.tabButtonActive]}><Text style={[styles.tabLabel, activeTab === 'admins' && styles.tabLabelActive]}>Admins</Text></Pressable>
        </View>

        <View style={styles.routeBanner}>
          <Text style={styles.routeText}>Route: {routeLabel}</Text>
          {currentRoute.key === 'contractorDetail' ? <Pressable onPress={handleGoBack}><Text style={styles.routeActionText}>Back</Text></Pressable> : null}
        </View>

        <View style={styles.navRow}>
          <Pressable onPress={handleLogout} style={styles.logoutChip}><Text style={styles.logoutText}>Logout</Text></Pressable>
        </View>

        {currentRoute.key === 'overview' ? <OverviewScreen overview={state.overview} /> : null}
        {currentRoute.key === 'contractors' ? (
          <ContractorsScreen
            contractors={state.contractors}
            filters={contractorFilters}
            onOpenContractor={handleOpenContractor}
            onFilterChange={(patch) => setContractorFilters((current) => ({ ...current, ...patch }))}
          />
        ) : null}
        {currentRoute.key === 'admins' ? (
          <AdminManagementScreen
            accounts={adminManagement.accounts}
            auditEvents={adminManagement.auditEvents}
            filters={adminFilters}
            draft={adminDraft}
            warning={adminManagement.warning}
            actionMessage={adminActionMessage}
            csvPreview={adminManagement.csvPreview}
            onDraftChange={(patch) => setAdminDraft((current) => ({ ...current, ...patch }))}
            onCreateAccount={() => void handleCreateManagedAdmin()}
            onRefresh={() => void refreshAdminManagement()}
            onFilterOutcome={(outcome) => {
              const nextFilters = { outcome };
              setAdminFilters(nextFilters);
              void refreshAdminManagement(nextFilters);
            }}
            onResetPassword={(adminUserId) => void handleRequestPasswordReset(adminUserId)}
            onRotateCredentials={(adminUserId, username) => void handleRotateCredentials(adminUserId, username)}
            onExportPreview={() => void handleExportAuditPreview()}
          />
        ) : null}
        {currentRoute.key === 'contractorDetail' ? (
          <ContractorDetailScreen
            contractor={selectedContractor}
            pendingActionReview={pendingActionReview}
            warning={detailWarning}
            onBack={handleGoBack}
            onCancelActionReview={handleCancelAdminActionReview}
            onConfirmActionReview={handleConfirmAdminActionReview}
            onRunAction={handleRunAdminAction}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
