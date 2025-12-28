import React from 'react';
import './ExecutionsList.css';

function ExecutionsList({ executions }) {
  if (executions.length === 0) {
    return (
      <section className="executions-section">
        <h2>Recent Executions</h2>
        <div className="empty-state">No executions yet</div>
      </section>
    );
  }

  return (
    <section className="executions-section">
      <h2>Recent Executions</h2>
      <div className="executions-list">
        {executions.map((exec) => (
          <div key={exec.executionId} className="execution-item">
            <div>
              <div className="job-id">Job: {exec.jobId.substring(0, 8)}...</div>
              <div className="execution-time">
                {new Date(exec.scheduledTime).toLocaleString()}
              </div>
            </div>
            <span className={`status-badge ${exec.status.toLowerCase()}`}>
              {exec.status}
            </span>
            <span>{exec.httpStatus ? `HTTP ${exec.httpStatus}` : '-'}</span>
            <span>{exec.duration ? `${exec.duration}ms` : '-'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ExecutionsList;

