import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Metrics
export const loadMetrics = async () => {
  const response = await api.get('/metrics');
  return response.data;
};

// Jobs
export const loadJobs = async () => {
  const response = await api.get('/jobs');
  return response.data;
};

export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

export const getJobDetails = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

export const updateJob = async (jobId, jobData) => {
  const response = await api.put(`/jobs/${jobId}`, jobData);
  return response.data;
};

// Executions
export const loadExecutions = async (limit = 20) => {
  const response = await api.get(`/executions?limit=${limit}`);
  return response.data;
};

export const getJobExecutions = async (jobId, limit = 5) => {
  const response = await api.get(`/jobs/${jobId}/executions?limit=${limit}`);
  return response.data;
};

export default api;

