import './pages/responsive.css';

import AssociationConsole from './pages/association-console.jsx';
import AssociationConsoleLanding from './pages/association-console-landing.jsx';
import AdminPortal from './pages/admin-portal';
import MemberPortal from './pages/member-portal';
import Notifications from './pages/notifications';
import DeveloperPortal from './pages/developer-portal';
import AdminApiKeys from './pages/admin-api-keys';
import AuditSearch from './pages/audit-search';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/association-console" element={<AssociationConsole />} />
      <Route path="/" element={<AssociationConsoleLanding />} />
      {/* ...existing routes... */}
      <Route path="/admin-portal" element={<AdminPortal />} />
      <Route path="/member-portal" element={<MemberPortal />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/developer-portal" element={<DeveloperPortal />} />
      <Route path="/admin-api-keys" element={<AdminApiKeys />} />
      <Route path="/audit-search" element={<AuditSearch />} />
    </Routes>
  );
}

export default App;