// services/frontend/src/AppRoutes.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OmnichannelLogin from './pages/OmnichannelLogin';
import OmnichannelDashboard from './pages/OmnichannelDashboard';

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path='/omnichannel/login' element={<OmnichannelLogin />} />
        <Route path='/omnichannel/dashboard' element={<OmnichannelDashboard />} />
      </Routes>
    </Router>
  );
}
