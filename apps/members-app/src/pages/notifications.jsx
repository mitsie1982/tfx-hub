import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get('/api/notifications/me', { headers: { 'x-api-key': window.localStorage.getItem('apiKey') } })
      .then(res => setNotifications(res.data))
      .catch(err => setStatus('Failed to load notifications'));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 24 }}>
      <h2>My Notifications</h2>
      {notifications.length === 0 && <div>No notifications yet.</div>}
      <ul>
        {notifications.map((n, i) => (
          <li key={i}>{n.message} <span style={{ color: '#888' }}>({n.channel})</span></li>
        ))}
      </ul>
      <div>{status}</div>
    </div>
  );
}
