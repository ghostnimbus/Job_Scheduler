# Job Scheduler React Frontend

A modern React-based frontend for the High-Throughput Job Scheduler.

## Features

- 📊 Real-time metrics dashboard
- ➕ Create jobs with a simple form
- 📋 View all jobs and their details
- 📈 Monitor executions in real-time
- 🔄 Auto-refresh every 5 seconds
- 📱 Responsive design

## Installation

```bash
cd frontend
npm install
```

## Running the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000` (or next available port).

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js
│   │   ├── MetricsDashboard.js
│   │   ├── CreateJobForm.js
│   │   ├── JobsList.js
│   │   ├── ExecutionsList.js
│   │   ├── JobDetailsModal.js
│   │   └── Footer.js
│   ├── services/
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## Configuration

The frontend connects to the API at `http://localhost:3000/api` by default.

To change the API URL, create a `.env` file:

```
REACT_APP_API_URL=http://your-api-url:3000/api
```

## Components

- **Header**: Status indicator and refresh button
- **MetricsDashboard**: System metrics cards
- **CreateJobForm**: Form to create new jobs
- **JobsList**: List of all active jobs
- **ExecutionsList**: Recent executions across all jobs
- **JobDetailsModal**: Detailed view of a job with execution history
- **Footer**: Footer with attribution

## API Integration

All API calls are handled through `src/services/api.js` using Axios.

