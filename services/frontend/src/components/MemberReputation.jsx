// services/frontend/src/components/MemberReputation.jsx
import React, { useEffect, useState } from 'react';

export default function MemberReputation({ memberAddress }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    async function load() {
      const resp = await fetch(`/api/reputation/count/${memberAddress}`);
      if (resp.ok) {
        const data = await resp.json();
        setCount(data.count);
      } else {
        setCount('N/A');
      }
    }
    if (memberAddress) load();
  }, [memberAddress]);

  return (
    <div>
      <h3>Reputation</h3>
      <p>On‑chain reputation events: {count === null ? 'Loading...' : count}</p>
      <button onClick={() => exportPortableRecord(memberAddress)}>Export Portable Record</button>
    </div>
  );
}

async function exportPortableRecord(memberAddress) {
  // Placeholder: call backend to assemble signed portable record (e.g., JSON + proof)
  const resp = await fetch(`/api/reputation/export/${memberAddress}`);
  if (resp.ok) {
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${memberAddress}_reputation.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  } else {
    alert('Export failed');
  }
}
