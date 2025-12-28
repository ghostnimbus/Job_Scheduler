import React, { useState } from 'react';
import './CreateJobForm.css';
import { createJob } from '../services/api';

function CreateJobForm({ onJobCreated }) {
  const [formData, setFormData] = useState({
    schedule: '',
    api: '',
    type: 'ATLEAST_ONCE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await createJob(formData);
      setSuccess(true);
      setFormData({
        schedule: '',
        api: '',
        type: 'ATLEAST_ONCE'
      });
      onJobCreated();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="form-section">
      <h2>Create New Job</h2>
      <form onSubmit={handleSubmit} className="job-form">
        <div className="form-group">
          <label htmlFor="schedule">Schedule (after every n seconds)</label>
          <input
            type="text"
            id="schedule"
            name="schedule"
            placeholder="*/10 * * * * *"
            value={formData.schedule}
            onChange={handleChange}
            required
          />
          <small>
            Format: second minute hour day month dayOfWeek<br />
            Examples: <code>*/10 * * * * *</code> (every 10s),{' '}
            <code>0 */5 * * * *</code> (every 5 min),{' '}
            <code>31 10-15 1 * * MON-FRI</code>
          </small>
        </div>
        <div className="form-group">
          <label htmlFor="api">API Endpoint</label>
          <input
            type="url"
            id="api"
            name="api"
            placeholder="https://httpbin.org/post"
            value={formData.api}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="type">Execution Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="ATLEAST_ONCE">ATLEAST_ONCE</option>
          </select>
        </div>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Job created successfully!</div>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Job'}
        </button>
      </form>
    </section>
  );
}

export default CreateJobForm;

