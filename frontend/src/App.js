import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import MetricsDashboard from './components/MetricsDashboard';
import CreateJobForm from './components/CreateJobForm';
import JobsList from './components/JobsList';
import ExecutionsList from './components/ExecutionsList';
import CurrentExecutions from './components/CurrentExecutions';
import JobDetailsModal from './components/JobDetailsModal';
import Alerts from './components/Alerts';
import Footer from './components/Footer';
import { checkHealth, loadMetrics, loadJobs, loadExecutions } from './services/api';

function App() {
  const [isOnline, setIsOnline] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failedExecutions, setFailedExecutions] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  useEffect(() => {
    // Initial load
    refreshData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    try {
      const health = await checkHealth();
      setIsOnline(health.status === 'healthy');

      if (health.status === 'healthy') {
        const [metricsData, jobsData, executionsData] = await Promise.all([
          loadMetrics(),
          loadJobs(),
          loadExecutions()
        ]);

        setMetrics(metricsData.scheduler);
        setJobs(jobsData.jobs || []);
        setExecutions(executionsData.executions || []);
        
        // Track failed executions for alerts
        const failed = (executionsData.executions || [])
          .filter(exec => exec.status === 'FAILED')
          .filter(exec => !dismissedAlerts.has(exec.executionId))
          .slice(0, 10); // Show max 10 recent failures
        setFailedExecutions(failed);
      } else {
        setIsOnline(false);
      }
    } catch (error) {
      setIsOnline(false);
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = () => {
    refreshData();
  };

  const handleJobUpdated = () => {
    refreshData();
  };

  const handleDismissAlerts = () => {
    const newDismissed = new Set(dismissedAlerts);
    failedExecutions.forEach(exec => {
      newDismissed.add(exec.executionId);
    });
    setDismissedAlerts(newDismissed);
    setFailedExecutions([]);
  };

  const handleJobClick = (jobId) => {
    setSelectedJob(jobId);
    setIsModalOpen(true);
  };

  const handleEditJob = (jobId) => {
    setSelectedJob(jobId);
    setEditMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Header 
        isOnline={isOnline} 
        onRefresh={refreshData}
        failureCount={failedExecutions.length}
      />
      
      <div className="container">
        <MetricsDashboard metrics={metrics} isOnline={isOnline} />
        <CurrentExecutions executions={executions} metrics={metrics} />
        <Alerts 
          failedExecutions={failedExecutions} 
          onDismiss={handleDismissAlerts}
        />
        <CreateJobForm onJobCreated={handleJobCreated} />
        <JobsList 
          jobs={jobs} 
          onJobClick={handleJobClick}
          onEditJob={handleEditJob}
        />
        <ExecutionsList executions={executions} />
      </div>

      <Footer />

      {isModalOpen && (
        <JobDetailsModal
          jobId={selectedJob}
          onClose={handleCloseModal}
          onJobUpdated={handleJobUpdated}
          initialEditMode={editMode}
        />
      )}
    </div>
  );
}

export default App;

