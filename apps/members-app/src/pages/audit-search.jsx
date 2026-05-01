import React, { useState } from 'react';
import axios from 'axios';

export default function AuditSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');

  const search = async () => {
    setStatus('Searching...');
    try {
      const res = await axios.get(`/api/admin/audit-search?q=${encodeURIComponent(query)}`);
      setResults(res.data);
      setStatus('');
    } catch (err) {
      setStatus('Failed to search audit log');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 24 }}>
      <h2>Audit Log Search</h2>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="event, email, etc." />
      <button onClick={search}>Search</button>
      <div>{status}</div>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
}
