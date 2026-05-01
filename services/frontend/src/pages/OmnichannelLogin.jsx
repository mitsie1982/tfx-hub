// services/frontend/src/pages/OmnichannelLogin.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OmnichannelLogin() {
  const [status, setStatus] = useState('Verifying token...');
  const loc = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(loc.search);
  const token = params.get('token');

  useEffect(() => {
    async function verify() {
      if (!token) { setStatus('Invalid link'); return; }
      try {
        // TODO: call backend to verify token and create session
        const resp = await fetch(`/api/omnichannel/verify?token=${token}`, { method: 'GET' });
        if (resp.ok) {
          setStatus('Login successful. Redirecting...');
          setTimeout(() => navigate('/omnichannel/dashboard'), 1200);
        } else {
          setStatus('Link expired or invalid.');
        }
      } catch (e) {
        setStatus('Verification failed.');
      }
    }
    verify();
  }, [token, navigate]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Web access for Members</h2>
      <p>{status}</p>
    </div>
  );
}
