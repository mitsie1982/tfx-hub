import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminApiKeys() {
  const [keys, setKeys] = useState({});
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get('/api/admin/list-api-keys').then(res => setKeys(res.data));
  }, [status]);

  const approve = async () => {
    setStatus('Approving...');
    await axios.post('/api/admin/approve-api-key', `email=${email}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    setStatus('Approved!');
  };
  const revoke = async () => {
    setStatus('Revoking...');
    await axios.post('/api/admin/revoke-api-key', `email=${email}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    setStatus('Revoked!');
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h2>API Key Admin Panel</h2>
      <div>
        <label>Email: <input value={email} onChange={e => setEmail(e.target.value)} /></label>
        <button onClick={approve}>Approve</button>
        <button onClick={revoke}>Revoke</button>
      </div>
      <h3>All API Keys</h3>
      <pre>{JSON.stringify(keys, null, 2)}</pre>
      <div>{status}</div>
    </div>
  );
}
