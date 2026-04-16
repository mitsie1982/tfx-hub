import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import DashboardScreen from './screens/DashboardScreen';
import BrowseProjectsScreen from './screens/BrowseProjectsScreen';
import AvailabilityScreen from './screens/AvailabilityScreen';
import BookingScreen from './screens/BookingScreen';
import CalendarSyncScreen from './screens/CalendarSyncScreen';
import { ContractorRoute, ContractorTabKey, createContractorRootRoute } from './navigation';
import { createMessageReview, createQuoteReview } from './actionReview';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import LeadHistoryScreen from './screens/LeadHistoryScreen';
import LoginScreen from './screens/LoginScreen';
import { confirmPasswordReset, expressInterest, fetchContractorProfile, fetchLeadHistory, fetchProjects, loginContractor, logoutContractor, registerContractor, requestPasswordReset, restoreContractorSession, sendMessage, submitQuote } from './services/contractorData';
import type { ContractorProfile, ContractorProject, LeadHistoryItem, LoginCredentials, MessageDraft, PasswordResetPayload, PendingProjectAction, QuoteDraft, RegistrationPayload } from './types';

type AuthMode = 'login' | 'register' | 'reset';


// Extend tab keys and nav items for new screens
type ExtendedTabKey = ContractorTabKey | 'availability' | 'booking' | 'calendarSync';
const navItems: Array<{ key: ExtendedTabKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'browse', label: 'Browse' },
  { key: 'history', label: 'History' },
  { key: 'availability', label: 'Availability' },
  { key: 'booking', label: 'Book' },
  { key: 'calendarSync', label: 'Calendar Sync' }
];

const defaultContractorRegistration: RegistrationPayload = {
  email: 'theuns.fraser@example.com',
  password: 'password123',
  firstName: 'Theuns',
  lastName: 'Fraser',
  trade: 'general contractor',
  phoneNumber: '+27710000001'
};

const defaultResetPayload: PasswordResetPayload = {
  email: 'contractor@example.com',
  token: '',
  password: 'password123'
};

const defaultQuoteDraft: QuoteDraft = {
  amount: 'R18,500',
  timeline: '10 working days',
  note: 'I can start this week, share staged progress updates, and include materials handling in the quote.'
};

const defaultMessageDraft: MessageDraft = {
  body: 'Hi Michelle, I reviewed the site notes and can help with the boundary wall extension and gate footing. I can confirm scope and timing today.'
};

export default function ContractorHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>('Sign in to connect to the contractor API server.');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [credentials, setCredentials] = useState<LoginCredentials>({
    identifier: (process && process.env && process.env.TFX_CONTRACTOR_LOGIN) || 'contractor@example.com',
    password: (process && process.env && process.env.TFX_CONTRACTOR_PASSWORD) || 'password123'
  });
  const [registration, setRegistration] = useState<RegistrationPayload>(defaultContractorRegistration);
  const [resetPayload, setResetPayload] = useState<PasswordResetPayload>(defaultResetPayload);
  const [activeTab, setActiveTab] = useState<ExtendedTabKey>('dashboard');
  const [routeStack, setRouteStack] = useState<ContractorRoute[]>([{ key: 'dashboard' }]);
  const [projects, setProjects] = useState<ContractorProject[]>([]);
  const [profile, setProfile] = useState<ContractorProfile>({
    professionalId: 'pro-003',
    name: 'Theuns Fraser',
    trade: 'general contractor',
    tier: 'TRUSTED',
    rating: 4.9,
    completedJobs: 128,
    activeQuotes: 7,
    responseTime: '8 min'
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeTrade, setActiveTrade] = useState('All');
  const [interestedProjectIds, setInterestedProjectIds] = useState<string[]>([]);
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [dataSource, setDataSource] = useState<'live' | 'sample'>('sample');
  const [warning, setWarning] = useState<string | null>(null);
  const [profileWarning, setProfileWarning] = useState<string | null>(null);
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(defaultQuoteDraft);
  const [messageDraft, setMessageDraft] = useState<MessageDraft>(defaultMessageDraft);
  const [pendingAction, setPendingAction] = useState<PendingProjectAction | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      const session = await restoreContractorSession();

      if (!mounted) {
        return;
      }

      setIsAuthenticated(session.authenticated);
      setAuthInfo(session.warning || (session.authenticated ? null : 'Sign in to connect to the contractor API server.'));
      setIsRestoringSession(false);
    }

    bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let mounted = true;

    async function loadIdentity() {
      const [profileResult, historyResult] = await Promise.all([
        fetchContractorProfile(),
        fetchLeadHistory()
      ]);

      if (!mounted) {
        return;
      }

      setProfile(profileResult.item);
      setHistory(historyResult.items);
      setProfileWarning(profileResult.warning || historyResult.warning || null);
    }

    loadIdentity();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setProjects([]);
      setSelectedProjectId(null);
      setWarning(null);
      return undefined;
    }

    let mounted = true;

    async function loadProjects() {
      const result = await fetchProjects({ trade: activeTrade, search: searchText });
      if (!mounted) {
        return;
      }

      setProjects(result.items);
      setDataSource(result.source);
      setWarning(result.warning || null);
      setSelectedProjectId((current) => {
        if (current && result.items.some((item) => item.id === current)) {
          return current;
        }
        return result.items[0]?.id || null;
      });
    }

    loadProjects();

    return () => {
      mounted = false;
    };
  }, [activeTrade, isAuthenticated, searchText]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'login') {
        await loginContractor(credentials);
        setIsAuthenticated(true);
        setAuthInfo(null);
        setIsRestoringSession(false);
        setActiveTab('dashboard');
        setRouteStack([createContractorRootRoute('dashboard')]);
      } else if (authMode === 'register') {
        await registerContractor(registration);
        setIsAuthenticated(true);
        setAuthInfo(null);
        setIsRestoringSession(false);
        setActiveTab('dashboard');
        setRouteStack([createContractorRootRoute('dashboard')]);
      } else if (!resetPayload.token.trim()) {
        const response = await requestPasswordReset(resetPayload.email);
        setAuthInfo(`Reset token issued: ${response.resetToken}`);
        setResetPayload((current) => ({ ...current, token: response.resetToken || current.token }));
      } else {
        await confirmPasswordReset(resetPayload.token, resetPayload.password);
        setAuthInfo('Password reset complete. Sign in with the new password.');
        setAuthMode('login');
        setCredentials((current) => ({ ...current, identifier: resetPayload.email, password: resetPayload.password }));
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    void logoutContractor();
    setIsAuthenticated(false);
    setHistory([]);
    setProjects([]);
    setInterestedProjectIds([]);
    setSelectedProjectId(null);
    setRegistration(defaultContractorRegistration);
    setResetPayload(defaultResetPayload);
    setQuoteDraft(defaultQuoteDraft);
    setMessageDraft(defaultMessageDraft);
    setPendingAction(null);
    setAuthInfo('Signed out. Sign in again to reconnect to the contractor API server.');
    setActiveTab('dashboard');
    setRouteStack([createContractorRootRoute('dashboard')]);
  };

  const actionLabel = authMode === 'login'
    ? 'Sign In'
    : authMode === 'register'
      ? 'Create Profile'
      : resetPayload.token.trim()
        ? 'Reset Password'
        : 'Request Reset Token';

  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  const appendHistory = (item: LeadHistoryItem) => {
    setHistory((current) => [item, ...current]);
  };

  const handleExpressInterest = async () => {
    if (!selectedProject) {
      return;
    }

    const response = await expressInterest(selectedProject.id, profile.professionalId);
    setInterestedProjectIds((current) => (current.includes(selectedProject.id) ? current : [...current, selectedProject.id]));
    appendHistory({
      id: response.id,
      jobId: selectedProject.id,
      jobTitle: selectedProject.title,
      type: 'interest',
      summary: 'Interest sent to homeowner',
      createdAt: 'Just now',
      status: 'sent',
      source: response.source
    });
  };

  const handleReviewQuote = () => {
    const review = createQuoteReview(selectedProject, quoteDraft);
    if (!review) {
      return;
    }

    setPendingAction(review);
  };

  const handleSubmitQuote = async () => {
    if (!pendingAction || pendingAction.type !== 'quote') {
      return;
    }

    const response = await submitQuote(pendingAction.projectId, pendingAction.quote);
    appendHistory({
      id: response.id,
      jobId: pendingAction.projectId,
      jobTitle: pendingAction.projectTitle,
      type: 'quote',
      summary: response.summary,
      createdAt: 'Just now',
      status: 'sent',
      source: response.source
    });
    setQuoteDraft(defaultQuoteDraft);
    setPendingAction(null);
    setActiveTab('history');
    setRouteStack([createContractorRootRoute('history')]);
  };

  const handlePreviewMessage = () => {
    const review = createMessageReview(selectedProject, messageDraft);
    if (!review) {
      return;
    }

    setPendingAction(review);
  };

  const handleSendMessage = async () => {
    if (!pendingAction || pendingAction.type !== 'message') {
      return;
    }

    const response = await sendMessage(pendingAction.projectId, pendingAction.message);
    appendHistory({
      id: response.id,
      jobId: pendingAction.projectId,
      jobTitle: pendingAction.projectTitle,
      type: 'message',
      summary: response.summary,
      createdAt: 'Just now',
      status: 'sent',
      source: response.source
    });
    setMessageDraft(defaultMessageDraft);
    setPendingAction(null);
    setActiveTab('history');
    setRouteStack([createContractorRootRoute('history')]);
  };


  // Handle navigation for extended tabs
  const handleSelectTab = (tab: ExtendedTabKey) => {
    setActiveTab(tab);
    setPendingAction(null);
    if (tab === 'dashboard' || tab === 'browse' || tab === 'history') {
      setRouteStack([createContractorRootRoute(tab as ContractorTabKey)]);
    } else {
      setRouteStack([{ key: tab } as any]);
    }
  };

  const handleGoBack = () => {
    setPendingAction(null);
    setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current);
  };

  const currentRoute = routeStack[routeStack.length - 1] || createContractorRootRoute((activeTab as ContractorTabKey));
  const routeLabel = currentRoute.key === 'detail'
    ? `Browse / ${selectedProject?.title || (currentRoute as any).projectId}`
    : navItems.find((item) => item.key === activeTab)?.label || 'Dashboard';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {isRestoringSession ? (
          <View style={styles.restoreCard}>
            <Text style={styles.restoreTitle}>Restoring session</Text>
            <Text style={styles.restoreText}>Checking for a saved contractor session.</Text>
          </View>
        ) : null}

        {!isRestoringSession && !isAuthenticated ? (
          <LoginScreen
            mode={authMode}
            identifier={credentials.identifier}
            email={registration.email || resetPayload.email}
            password={authMode === 'login' ? credentials.password : authMode === 'register' ? registration.password : resetPayload.password}
            firstName={registration.firstName}
            lastName={registration.lastName}
            trade={registration.trade}
            phoneNumber={registration.phoneNumber || ''}
            resetToken={resetPayload.token}
            error={authError}
            info={authInfo}
            loading={authLoading}
            actionLabel={actionLabel}
            onModeChange={(mode) => {
              setAuthMode(mode);
              setAuthError(null);
              setAuthInfo(mode === 'login' ? 'Sign in to connect to the contractor API server.' : null);
            }}
            onIdentifierChange={(identifier) => {
              setCredentials((current) => ({ ...current, identifier }));
            }}
            onEmailChange={(email) => {
              setRegistration((current) => ({ ...current, email }));
              setResetPayload((current) => ({ ...current, email }));
            }}
            onPasswordChange={(password) => {
              if (authMode === 'login') {
                setCredentials((current) => ({ ...current, password }));
              } else if (authMode === 'register') {
                setRegistration((current) => ({ ...current, password }));
              } else {
                setResetPayload((current) => ({ ...current, password }));
              }
            }}
            onFirstNameChange={(firstName) => setRegistration((current) => ({ ...current, firstName }))}
            onLastNameChange={(lastName) => setRegistration((current) => ({ ...current, lastName }))}
            onTradeChange={(trade) => setRegistration((current) => ({ ...current, trade }))}
            onPhoneNumberChange={(phoneNumber) => setRegistration((current) => ({ ...current, phoneNumber }))}
            onResetTokenChange={(token) => setResetPayload((current) => ({ ...current, token }))}
            onSubmit={handleLogin}
          />
        ) : null}

        {!isRestoringSession && isAuthenticated ? (
          <View style={styles.routeBanner}>
            <Text style={styles.routeText}>Route: {routeLabel}</Text>
            {currentRoute.key === 'detail' ? <Pressable onPress={handleGoBack}><Text style={styles.routeActionText}>Back</Text></Pressable> : null}
          </View>
        ) : null}

        {/* Dashboard */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'dashboard' ? (
          <DashboardScreen
            profile={profile}
            projectCount={projects.length}
            interestedCount={interestedProjectIds.length}
            historyCount={history.length}
            dataSource={dataSource}
            onBrowseProjects={() => handleSelectTab('browse')}
            onOpenHistory={() => handleSelectTab('history')}
          />
        ) : null}

        {!isRestoringSession && isAuthenticated && currentRoute.key === 'dashboard' && profileWarning ? (
          <Text style={styles.warningText}>{profileWarning}</Text>
        ) : null}

        {/* Browse Projects */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'browse' ? (
          <BrowseProjectsScreen
            projects={projects}
            selectedProjectId={selectedProjectId}
            searchText={searchText}
            activeTrade={activeTrade}
            warning={warning}
            onSelectProject={setSelectedProjectId}
            onSearchTextChange={setSearchText}
            onTradeChange={setActiveTrade}
            onOpenDetails={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('browse');
              setRouteStack((current) => [...current, { key: 'detail', projectId }]);
            }}
          />
        ) : null}

        {/* Project Detail */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'detail' ? (
          <ProjectDetailScreen
            project={selectedProject}
            interested={selectedProject ? interestedProjectIds.includes(selectedProject.id) : false}
            quoteDraft={quoteDraft}
            messageDraft={messageDraft}
            onQuoteChange={(patch) => setQuoteDraft((current) => ({ ...current, ...patch }))}
            onMessageChange={(patch) => setMessageDraft((current) => ({ ...current, ...patch }))}
            pendingAction={pendingAction}
            onExpressInterest={handleExpressInterest}
            onReviewQuote={handleReviewQuote}
            onConfirmQuote={handleSubmitQuote}
            onPreviewMessage={handlePreviewMessage}
            onConfirmMessage={handleSendMessage}
            onCancelReview={() => setPendingAction(null)}
          />
        ) : null}


        {/* Lead History */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'history' ? <LeadHistoryScreen history={history} /> : null}

        {/* Availability Management */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'availability' ? <AvailabilityScreen /> : null}

        {/* Booking Screen */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'booking' ? <BookingScreen /> : null}

        {/* Calendar Sync Screen */}
        {!isRestoringSession && isAuthenticated && currentRoute.key === 'calendarSync' ? <CalendarSyncScreen /> : null}

        {!isRestoringSession && isAuthenticated ? (
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {!isRestoringSession && isAuthenticated ? <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = item.key === activeTab;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleSelectTab(item.key)}
              style={[styles.navItem, isActive && styles.navItemActive]}
            >
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f1ea' },
  content: { padding: 16, paddingBottom: 96 },
  restoreCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eadfca',
    marginBottom: 18
  },
  restoreTitle: { color: '#18231c', fontSize: 20, fontWeight: '700', marginBottom: 6 },
  restoreText: { color: '#5f6d64', fontSize: 14 },
  warningText: {
    color: '#8b5e34',
    backgroundColor: '#fff3cd',
    borderColor: '#f1d28a',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: -6,
    marginBottom: 16
  },
  routeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4
  },
  routeText: { color: '#5f6d64', fontSize: 13, fontWeight: '600' },
  routeActionText: { color: '#123524', fontSize: 13, fontWeight: '700' },
  logoutButton: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: '#eadfca',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  logoutText: { color: '#8b5e34', fontWeight: '700' },
  navBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    backgroundColor: '#123524',
    borderRadius: 20,
    padding: 8
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14
  },
  navItemActive: { backgroundColor: '#214c35' },
  navLabel: { color: '#d6e6d8', fontWeight: '600', fontSize: 13 },
  navLabelActive: { color: '#ffffff' }
});
