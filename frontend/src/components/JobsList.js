import React from 'react';
import './JobsList.css';

function JobsList({ jobs, onJobClick, onEditJob }) {
  if (jobs.length === 0) {
    return (
      <section className="jobs-section">
        <h2>Active Jobs</h2>
        <div className="empty-state">No jobs created yet</div>
      </section>
    );
  }

  return (
    <section className="jobs-section">
      <h2>Active Jobs</h2>
      <div className="jobs-list">
        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="job-card"
            onClick={() => onJobClick(job.jobId)}
          >
            <div className="job-card-header">
              <div>
                <div className="job-id">{job.jobId.substring(0, 8)}...</div>
                <div className="job-schedule">{job.schedule}</div>
              </div>
            </div>
            <div className="job-api">{job.api}</div>
            <div className="job-actions">
              <button
                className="btn btn-primary btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditJob) {
                    onEditJob(job.jobId);
                  } else {
                    onJobClick(job.jobId);
                  }
                }}
                title="Edit Job"
              >
                ✏️ Edit
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  onJobClick(job.jobId);
                }}
                title="View Details"
              >
                👁️ View
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default JobsList;

