import React from 'react';
import './CurrentExecutions.css';

function CurrentExecutions({ executions, metrics }) {
  // Filter for currently running executions (PENDING status)
  const currentExecutions = executions.filter(exec => exec.status === 'PENDING');
  
  // Also show count from metrics if available
  const activeCount = metrics?.activeExecutions || currentExecutions.length;

  if (currentExecutions.length === 0 && activeCount === 0) {
    return (
      <section className="current-executions-section">
        <h2>🔄 Current Executions</h2>
        <div className="current-executions-empty">
          <div className="empty-icon">⏸️</div>
          <p>No executions currently running</p>
        </div>
      </section>
    );
  }

  return (
    <section className="current-executions-section">
      <div className="current-executions-header">
        <h2>🔄 Current Executions</h2>
        <div className="active-count-badge">
          {activeCount} Active
        </div>
      </div>
      <div className="current-executions-list">
        {currentExecutions.length > 0 ? (
          currentExecutions.map((exec) => {
            const scheduledTime = new Date(exec.scheduledTime);
            const now = new Date();
            const elapsed = Math.floor((now - scheduledTime) / 1000); // seconds
            
            return (
              <div key={exec.executionId} className="current-execution-card">
                <div className="execution-pulse"></div>
                <div className="execution-content">
                  <div className="execution-header-row">
                    <div className="execution-job-info">
                      <div className="job-id-label">Job ID</div>
                      <div className="job-id-value">{exec.jobId.substring(0, 8)}...</div>
                    </div>
                    <span className="status-badge-running">RUNNING</span>
                  </div>
                  <div className="execution-details">
                    <div className="execution-time-info">
                      <span className="time-label">Scheduled:</span>
                      <span className="time-value">{scheduledTime.toLocaleTimeString()}</span>
                    </div>
                    <div className="execution-elapsed">
                      <span className="elapsed-label">Running for:</span>
                      <span className="elapsed-value">{formatElapsedTime(elapsed)}</span>
                    </div>
                  </div>
                  {exec.retryCount > 0 && (
                    <div className="execution-retry-info">
                      Retry attempt: {exec.retryCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="current-executions-placeholder">
            <div className="placeholder-icon">⚡</div>
            <p>Executions are running but details are being processed...</p>
            <div className="active-count-info">
              {activeCount} execution{activeCount !== 1 ? 's' : ''} currently active
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatElapsedTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

export default CurrentExecutions;

