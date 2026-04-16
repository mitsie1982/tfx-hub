import React, { useState } from "react";
import axios from "axios";

export default function ContractPanel({ jobId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("");

  async function initiate() {
    setLoading(true);
    await axios.post(`/api/jobs/${jobId}/contract/initiate`, {});
    setLoading(false);
    setStatus("pending");
  }
  async function sign(role) {
    setLoading(true);
    await axios.post(`/api/jobs/${jobId}/contract/sign`, { role });
    setLoading(false);
    setStatus("signed");
  }
  async function fetchStatus() {
    setLoading(true);
    const resp = await axios.get(`/api/jobs/${jobId}/contract`);
    setLoading(false);
    setStatus(resp.data.contract);
  }

  return (
    <div>
      <h3>Digital Contract</h3>
      <button onClick={initiate} disabled={loading}>Initiate Contract</button>
      <button onClick={() => sign("client") } disabled={loading}>Sign as Client</button>
      <button onClick={() => sign("contractor") } disabled={loading}>Sign as Contractor</button>
      <button onClick={fetchStatus} disabled={loading}>Check Status</button>
      {status && (
        <pre>{JSON.stringify(status, null, 2)}</pre>
      )}
    </div>
  );
}
