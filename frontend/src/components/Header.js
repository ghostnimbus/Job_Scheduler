import React from 'react';
import './Header.css';

function Header({ isOnline, onRefresh, failureCount }) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1>Lenskart Job Scheduler</h1>
        <div className="header-actions">
          {failureCount > 0 && (
            <div className="failure-badge" title={`${failureCount} job execution failure(s)`}>
              ⚠️ {failureCount} Failure{failureCount !== 1 ? 's' : ''}
            </div>
          )}
          <button
            className={`btn btn-secondary ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <div className="status-indicator">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

