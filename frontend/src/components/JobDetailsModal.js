import React, { useState, useEffect } from 'react';
import './JobDetailsModal.css';
import { getJobDetails, getJobExecutions, updateJob } from '../services/api';

function JobDetailsModal({ jobId, onClose, onJobUpdated, initialEditMode = false }) {
  const [job, setJob] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editFormData, setEditFormData] = useState({
    schedule: '',
    api: '',
    type: 'ATLEAST_ONCE'
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const [jobData, executionsData] = await Promise.all([
        getJobDetails(jobId),
        getJobExecutions(jobId)
      ]);
      setJob(jobData);
      setEditFormData({
        schedule: jobData.schedule,
        api: jobData.api,
        type: jobData.type
      });
      setExecutions(executionsData.executions || []);
      // Set edit mode if initialEditMode is true
      if (initialEditMode) {
        setIsEditing(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (job) {
      setEditFormData({
        schedule: job.schedule,
        api: job.api,
        type: job.type
      });
    }
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
    setUpdateError(null);
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      await updateJob(jobId, editFormData);
      setUpdateSuccess(true);
      setIsEditing(false);
      await loadJobDetails();
      if (onJobUpdated) {
        onJobUpdated();
      }
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setUpdateError(err.response?.data?.error || err.message || 'Failed to update job');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="close" onClick={onClose}>&times;</span>
          <div className="loading">Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <span className="close" onClick={onClose}>&times;</span>
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <div className="modal-header">
          <h2>Job Details</h2>
          {job && !isEditing && (
            <button className="btn btn-primary btn-small" onClick={handleEditClick}>
              Edit Job
            </button>
          )}
        </div>
        {job && (
          <>
            {!isEditing ? (
              <div className="job-details">
                <div className="detail-row">
                  <strong>Job ID:</strong>
                  <span className="job-id">{job.jobId}</span>
                </div>
                <div className="detail-row">
                  <strong>Schedule:</strong>
                  <code>{job.schedule}</code>
                </div>
                <div className="detail-row">
                  <strong>API Endpoint:</strong>
                  <span>{job.api}</span>
                </div>
                <div className="detail-row">
                  <strong>Type:</strong>
                  <span>{job.type}</span>
                </div>
                <div className="detail-row">
                  <strong>Created:</strong>
                  <span>{new Date(job.createdAt).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <strong>Last Updated:</strong>
                  <span>{new Date(job.updatedAt).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <strong>Active:</strong>
                  <span>{job.active ? 'Yes' : 'No'}</span>
                </div>
                {job.stats && (
                  <>
                    <div className="detail-row">
                      <strong>Total Executions:</strong>
                      <span>{job.stats.total || 0}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Successful:</strong>
                      <span style={{ color: 'var(--success-color)' }}>
                        {job.stats.success || 0}
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>Failed:</strong>
                      <span style={{ color: 'var(--danger-color)' }}>
                        {job.stats.failed || 0}
                      </span>
                    </div>
                    <div className="detail-row">
                      <strong>Avg Duration:</strong>
                      <span>
                        {job.stats.avgDuration
                          ? `${job.stats.avgDuration}ms`
                          : 'N/A'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form className="edit-job-form" onSubmit={handleUpdateJob}>
                <div className="form-group">
                  <label htmlFor="edit-schedule">Schedule (CRON)</label>
                  <input
                    type="text"
                    id="edit-schedule"
                    name="schedule"
                    value={editFormData.schedule}
                    onChange={handleEditChange}
                    placeholder="*/10 * * * * *"
                    required
                  />
                  <small>
                    Format: second minute hour day month dayOfWeek
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="edit-api">API Endpoint</label>
                  <input
                    type="url"
                    id="edit-api"
                    name="api"
                    value={editFormData.api}
                    onChange={handleEditChange}
                    placeholder="https://httpbin.org/post"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-type">Execution Type</label>
                  <select
                    id="edit-type"
                    name="type"
                    value={editFormData.type}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="ATLEAST_ONCE">ATLEAST_ONCE</option>
                  </select>
                </div>
                {updateError && <div className="error-message">{updateError}</div>}
                {updateSuccess && <div className="success-message">Job updated successfully!</div>}
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    disabled={updateLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateLoading}
                  >
                    {updateLoading ? 'Updating...' : 'Update Job'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
        <h3>Executions (Last 5)</h3>
        <div className="job-executions">
          {executions.length > 0 ? (
            executions.map((exec) => (
              <div key={exec.executionId} className="execution-detail">
                <div className="execution-header">
                  <strong>{new Date(exec.scheduledTime).toLocaleString()}</strong>
                  <span className={`status-badge ${exec.status.toLowerCase()}`}>
                    {exec.status}
                  </span>
                </div>
                <div className="execution-info">
                  {exec.httpStatus && `HTTP ${exec.httpStatus} • `}
                  {exec.duration && `${exec.duration}ms • `}
                  {exec.retryCount > 0 && `Retries: ${exec.retryCount}`}
                  {exec.errorMessage && (
                    <div style={{ color: 'var(--danger-color)', marginTop: '0.5rem' }}>
                      Error: {exec.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No executions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobDetailsModal;

