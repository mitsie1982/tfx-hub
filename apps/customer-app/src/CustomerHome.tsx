import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import AuthScreen from './screens/AuthScreen';
import { createCustomerRootRoute, CustomerRoute, CustomerTabKey } from './navigation';
import OverviewScreen from './screens/OverviewScreen';
import ProfessionalDetailScreen from './screens/ProfessionalDetailScreen';
import ProfessionalsScreen from './screens/ProfessionalsScreen';
import RequestJobScreen from './screens/RequestJobScreen';
import { createRequestReview } from './requestReview';
import { buildCustomerContactRequest, createCustomerJobRequest, fetchCustomerOverview, fetchCustomerProfessionalDetail, getCustomerProfessionalShortlist, loginCustomer, logoutCustomer, registerCustomer, requestCustomerPasswordReset, restoreCustomerSession, toggleCustomerProfessionalShortlist } from './services/customerData';
import { styles } from './styles';

type AuthMode = 'login' | 'register' | 'reset';

const navItems: Array<{ key: CustomerTabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'professionals', label: 'Professionals' },
  { key: 'request', label: 'Request Job' }
];

const defaultCustomerRegistration = {
  email: 'michelle.brummer@example.com',
  password: 'password123',
  firstName: 'Michelle',
  lastName: 'Brummer',
  phoneNumber: '+27719990031'
};

const defaultCustomerRequestForm = {
  title: 'Boundary wall extension and gate footing',
  trade: 'builder',
  description: 'Please help me coordinate a boundary wall extension, gate footing, and neat plaster finish with progress photo updates.',
  budget: 'R15,000 - R28,000',
  location: 'Midrand',
  urgency: 'This week'
};

export default function CustomerHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>('Sign in to manage jobs and browse professionals.');
  const [activeTab, setActiveTab] = useState<CustomerTabKey>('overview');
  const [routeStack, setRouteStack] = useState<CustomerRoute[]>([{ key: 'overview' }]);
  const [credentials, setCredentials] = useState({ email: 'client@example.com', password: 'password123' });
  const [registration, setRegistration] = useState(defaultCustomerRegistration);
  const [resetEmail, setResetEmail] = useState('client@example.com');
  const [overview, setOverview] = useState({ user: null as any, jobs: [] as any[], professionals: [] as any[], source: 'sample' as 'live' | 'sample', warning: null as string | null });
  const [selectedProfessional, setSelectedProfessional] = useState<any | null>(null);
  const [detailWarning, setDetailWarning] = useState<string | null>(null);
  const [shortlistedProfessionalIds, setShortlistedProfessionalIds] = useState<string[]>(() => getCustomerProfessionalShortlist());
  const [requestForm, setRequestForm] = useState(defaultCustomerRequestForm);
  const [pendingRequest, setPendingRequest] = useState<typeof requestForm | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const session = await restoreCustomerSession();
      if (!mounted) {
        return;
      }
      setIsAuthenticated(session.authenticated);
      setAuthInfo(session.warning || (session.authenticated ? null : 'Sign in to manage jobs and browse professionals.'));
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
    async function loadOverview() {
      const nextOverview = await fetchCustomerOverview();
      if (mounted) {
        setOverview(nextOverview);
      }
    }

    loadOverview();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  async function handleAuthAction() {
    setAuthError(null);

    try {
      if (authMode === 'login') {
        await loginCustomer(credentials);
        setIsAuthenticated(true);
        setAuthInfo(null);
      } else if (authMode === 'register') {
        await registerCustomer(registration);
        setIsAuthenticated(true);
        setAuthInfo(null);
      } else {
        const response = await requestCustomerPasswordReset(resetEmail);
        setAuthInfo(`Reset token issued: ${response.resetToken || 'check API response'}`);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to continue.');
    }
  }

  async function handleCreateJobRequest() {
    if (!pendingRequest) {
      return;
    }

    try {
      await createCustomerJobRequest(pendingRequest);
      setAuthInfo('Job request submitted successfully.');
      setRequestForm(defaultCustomerRequestForm);
      setPendingRequest(null);
      setActiveTab('overview');
      setRouteStack([createCustomerRootRoute('overview')]);
      if (isAuthenticated) {
        setOverview(await fetchCustomerOverview());
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create job request.');
    }
  }

  async function handleOpenProfessional(professionalId: string) {
    const result = await fetchCustomerProfessionalDetail(professionalId);
    setSelectedProfessional(result.item);
    setDetailWarning(result.warning || null);
    setActiveTab('professionals');
    setRouteStack((current) => [...current, { key: 'professionalDetail', professionalId }]);
  }

  function handleToggleShortlist() {
    if (!selectedProfessional) {
      return;
    }

    const result = toggleCustomerProfessionalShortlist(selectedProfessional.id);
    setShortlistedProfessionalIds(result.items);
    setAuthInfo(result.shortlisted ? `${selectedProfessional.name} added to your shortlist.` : `${selectedProfessional.name} removed from your shortlist.`);
  }

  function handleContactProfessional() {
    if (!selectedProfessional) {
      return;
    }

    setRequestForm(buildCustomerContactRequest(selectedProfessional));
    setPendingRequest(null);
    setActiveTab('request');
    setRouteStack([createCustomerRootRoute('request')]);
    setAuthInfo(`Request form prepared to contact ${selectedProfessional.name}.`);
  }

  function handleReviewRequest() {
    const review = createRequestReview(requestForm);
    if (!review) {
      setAuthError('Title, trade, and description are required before review.');
      return;
    }

    setAuthError(null);
    setPendingRequest(review);
  }

  function handleSelectTab(tab: CustomerTabKey) {
    setActiveTab(tab);
    setPendingRequest(null);
    setRouteStack([createCustomerRootRoute(tab)]);
  }

  function handleGoBack() {
    setPendingRequest(null);
    setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current);
  }

  function handleLogout() {
    void logoutCustomer();
    setIsAuthenticated(false);
    setOverview({ user: null, jobs: [], professionals: [], source: 'sample', warning: null });
    setPendingRequest(null);
    setRegistration(defaultCustomerRegistration);
    setResetEmail('client@example.com');
    setRequestForm(defaultCustomerRequestForm);
    setActiveTab('overview');
    setRouteStack([createCustomerRootRoute('overview')]);
    setAuthInfo('Signed out. Sign in again to manage your jobs.');
  }

  if (isRestoringSession) {
    return <SafeAreaView style={styles.safeArea}><Text style={styles.loadingText}>Restoring customer session...</Text></SafeAreaView>;
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthScreen
          authMode={authMode}
          authInfo={authInfo}
          authError={authError}
          credentials={credentials}
          registration={registration}
          resetEmail={resetEmail}
          onModeChange={setAuthMode}
          onCredentialsChange={(patch) => setCredentials((current) => ({ ...current, ...patch }))}
          onRegistrationChange={(patch) => setRegistration((current) => ({ ...current, ...patch }))}
          onResetEmailChange={setResetEmail}
          onSubmit={handleAuthAction}
        />
      </SafeAreaView>
    );
  }

  const userName = overview.user ? `${overview.user.firstName || ''} ${overview.user.lastName || ''}`.trim() || overview.user.email : 'Customer';
  const currentRoute = routeStack[routeStack.length - 1] || createCustomerRootRoute(activeTab);
  const routeLabel = currentRoute.key === 'professionalDetail' ? `Directory / ${selectedProfessional?.name || currentRoute.professionalId}` : navItems.find((item) => item.key === activeTab)?.label || 'Overview';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Customer workspace</Text>
          <Text style={styles.title}>{userName}</Text>
          <Text style={styles.subtitle}>{overview.source === 'live' ? 'Live project and professional data connected' : 'Sample customer workspace data'}</Text>
          {overview.warning ? <Text style={styles.warningBanner}>{overview.warning}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statValue}>{overview.jobs.length}</Text><Text style={styles.statLabel}>Open jobs</Text></View>
            <View style={styles.statCard}><Text style={styles.statValue}>{overview.professionals.length}</Text><Text style={styles.statLabel}>Professionals</Text></View>
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

        <View style={styles.navRow}>
          <Pressable onPress={handleLogout} style={styles.logoutChip}><Text style={styles.logoutText}>Logout</Text></Pressable>
        </View>

        {currentRoute.key === 'overview' ? <OverviewScreen jobs={overview.jobs} /> : null}
        {currentRoute.key === 'professionals' ? <ProfessionalsScreen professionals={overview.professionals} onOpenProfessional={handleOpenProfessional} /> : null}
        {currentRoute.key === 'professionalDetail' ? <ProfessionalDetailScreen professional={selectedProfessional} warning={detailWarning} shortlisted={selectedProfessional ? shortlistedProfessionalIds.includes(selectedProfessional.id) : false} onBack={handleGoBack} onToggleShortlist={handleToggleShortlist} onContact={handleContactProfessional} /> : null}
        {currentRoute.key === 'request' ? <RequestJobScreen requestForm={requestForm} pendingRequest={pendingRequest} onChange={(patch) => setRequestForm((current) => ({ ...current, ...patch }))} onReview={handleReviewRequest} onConfirm={handleCreateJobRequest} onCancelReview={() => setPendingRequest(null)} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
