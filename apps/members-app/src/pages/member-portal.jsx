import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function MemberPortal() {
  const [profile, setProfile] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get('/api/public/user/me', { headers: { 'x-api-key': window.localStorage.getItem('apiKey') } })
      .then(res => setProfile(res.data));
    axios.get('/api/public/reputation/me', { headers: { 'x-api-key': window.localStorage.getItem('apiKey') } })
      .then(res => setReputation(res.data.score));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 24 }}>
      <h2>Member Portal</h2>
      {profile && (
        <div>
          <div>Name: {profile.name}</div>
          <div>Role: {profile.role}</div>
        </div>
      )}
      {reputation !== null && <div>Blockchain Reputation: {reputation}</div>}
      <div>{status}</div>
    </div>
  );
}
