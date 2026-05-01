import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AssociationConsoleLanding() {
  const navigate = useNavigate();

  useEffect(() => {
    // Example: auto-redirect based on role
    const role = window.localStorage.getItem('role');
    if (role === 'admin') navigate('/association-console?tab=admin');
    else if (role === 'developer') navigate('/association-console?tab=developer');
    else navigate('/association-console?tab=member');
  }, [navigate]);

  return (
    <div style={{ textAlign: 'center', marginTop: 80 }}>
      <img src="/src/pages/tfxhub-logo.png" alt="TFX Hub Logo" style={{ width: 220, marginBottom: 32 }} />
      <h1>Welcome to TFX Hub Association Console</h1>
      <p>Redirecting to your dashboard...</p>
    </div>
  );
}
