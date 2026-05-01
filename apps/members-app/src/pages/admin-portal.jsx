import React from 'react';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminPortal() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    axios.get('/api/admin/users').then(res => setUsers(res.data));
  }, []);

  const sendNotification = async () => {
    setStatus('Sending...');
    try {
      await axios.post('/admin/notify', { userId: selectedUser, message });
      setStatus('Notification sent!');
    } catch (err) {
      setStatus('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 24 }}>
      <h2>Association Admin Portal</h2>
      <div>
        <label>User:
          <select value={selectedUser || ''} onChange={e => setSelectedUser(e.target.value)}>
            <option value='' disabled>Select user</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
          </select>
        </label>
      </div>
      <div>
        <label>Message:
          <input value={message} onChange={e => setMessage(e.target.value)} style={{ width: '100%' }} />
        </label>
      </div>
      <button onClick={sendNotification} disabled={!selectedUser || !message}>Send Notification</button>
      <div>{status}</div>
    </div>
  );
}
