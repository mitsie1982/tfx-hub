
import React, { useState, useEffect } from 'react';
import AdminPortal from './admin-portal.jsx';
import AdminApiKeys from './admin-api-keys.jsx';
import AuditSearch from './audit-search.jsx';
import Notifications from './notifications.jsx';
import MemberPortal from './member-portal.jsx';
import DeveloperPortal from './developer-portal.jsx';

const ALL_TABS = [
  { key: 'admin', label: 'Admin Portal', roles: ['admin'], component: <AdminPortal /> },
  { key: 'apiKeys', label: 'API Keys', roles: ['admin'], component: <AdminApiKeys /> },
  { key: 'audit', label: 'Audit Log', roles: ['admin'], component: <AuditSearch /> },
  { key: 'notifications', label: 'Notifications', roles: ['admin', 'member', 'developer'], component: <Notifications /> },
  { key: 'member', label: 'Member Portal', roles: ['member'], component: <MemberPortal /> },
  { key: 'developer', label: 'Developer Portal', roles: ['developer'], component: <DeveloperPortal /> },
];

function getRole() {
  // Example: get role from localStorage or default to 'member'
  return window.localStorage.getItem('role') || 'member';
}

export default function AssociationConsole() {
  const [tab, setTab] = useState(null);
  const [role, setRole] = useState(getRole());

  useEffect(() => {
    // Set default tab based on role or URL param
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab && ALL_TABS.some(t => t.key === urlTab && t.roles.includes(role))) {
      setTab(urlTab);
    } else {
      // Default tab for role
      const firstTab = ALL_TABS.find(t => t.roles.includes(role));
      setTab(firstTab?.key || null);
    }
  }, [role]);

  const visibleTabs = ALL_TABS.filter(t => t.roles.includes(role));

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 24 }}>
      <img src="/src/pages/tfxhub-logo.png" alt="TFX Hub Logo" style={{ width: 120, marginBottom: 16 }} />
      <h1>Association Console</h1>
      <nav style={{ marginBottom: 24 }}>
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ marginRight: 8, fontWeight: tab === t.key ? 'bold' : 'normal' }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div>
        {visibleTabs.find(t => t.key === tab)?.component}
      </div>
    </div>
  );
}
