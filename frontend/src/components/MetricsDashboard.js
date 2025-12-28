import React from 'react';
import './MetricsDashboard.css';

function MetricsDashboard({ metrics, isOnline }) {
  if (!isOnline || !metrics) {
    return (
      <section className="metrics-section">
        <h2>System Metrics</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Active Jobs</div>
            <div className="metric-value">-</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Active Executions</div>
            <div className="metric-value">-</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Executions</div>
            <div className="metric-value">-</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Avg Drift (ms)</div>
            <div className="metric-value">-</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="metrics-section">
      <h2>System Metrics</h2>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Active Jobs</div>
          <div className="metric-value">{metrics.activeJobs || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Executions</div>
          <div className="metric-value">{metrics.activeExecutions || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Executions</div>
          <div className="metric-value">{metrics.totalExecutions || 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Drift (ms)</div>
          <div className="metric-value">{metrics.averageDrift || 0}</div>
        </div>
      </div>
    </section>
  );
}

export default MetricsDashboard;

