import React from 'react';
import './Alerts.css';

function Alerts({ failedExecutions, onDismiss }) {
  if (!failedExecutions || failedExecutions.length === 0) {
    return null;
  }

  return (
    <section className="alerts-section">
      <div className="alerts-header">
        <h2>
          <span className="alert-icon">⚠️</span>
          Job Execution Failures
          <span className="alert-count">{failedExecutions.length}</span>
        </h2>
        {onDismiss && (
          <button className="btn btn-secondary btn-small" onClick={onDismiss}>
            Dismiss All
          </button>
        )}
      </div>
      <div className="alerts-list">
        {failedExecutions.map((execution) => (
          <div key={execution.executionId} className="alert-item">
            <div className="alert-content">
              <div className="alert-header">
                <div>
                  <strong>Job ID:</strong> {execution.jobId.substring(0, 8)}...
                </div>
                <span className="alert-time">
                  {new Date(execution.scheduledTime).toLocaleString()}
                </span>
              </div>
              <div className="alert-details">
                <div className="alert-message">
                  <strong>Error:</strong> {execution.errorMessage || 'Execution failed'}
                </div>
                {execution.httpStatus && (
                  <div className="alert-meta">
                    HTTP Status: {execution.httpStatus}
                  </div>
                )}
                {execution.retryCount > 0 && (
                  <div className="alert-meta">
                    Retries: {execution.retryCount}
                  </div>
                )}
                {execution.duration && (
                  <div className="alert-meta">
                    Duration: {execution.duration}ms
                  </div>
                )}
              </div>
            </div>
            <div className="alert-status">
              <span className="status-badge failed">FAILED</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Alerts;

