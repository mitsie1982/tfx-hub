// services/frontend/src/pages/OmnichannelDashboard.jsx
import React, { useEffect, useState } from 'react';

export default function OmnichannelDashboard() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    async function load() {
      // TODO: call backend to fetch member tasks
      const resp = await fetch('/api/omnichannel/tasks'); // placeholder
      if (resp.ok) {
        const data = await resp.json();
        setTasks(data.tasks || []);
      } else {
        setTasks([]);
      }
    }
    load();
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h2>Your Tasks</h2>
      {tasks.length === 0 ? <p>No tasks assigned.</p> : (
        <ul>
          {tasks.map(t => (
            <li key={t.id}>
              <strong>{t.title}</strong>
              <div>
                <button onClick={() => acceptTask(t.id)}>Accept</button>
                <a href={`/omnichannel/tasks/${t.id}`}>View</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function acceptTask(taskId) {
  await fetch(`/api/omnichannel/tasks/${taskId}/accept`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ memberId: 'PLACEHOLDER' }) });
  window.location.reload();
}
