/**
 * Simple test script to verify API functionality
 * Run: node test-api.js
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🧪 Testing Job Scheduler API...\n');

  try {
    // 1. Health check
    console.log('1. Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);
    console.log('');

    // 2. Create a job
    console.log('2. Creating a job...');
    const createResponse = await axios.post(`${BASE_URL}/jobs`, {
      schedule: '*/10 * * * * *', // Every 10 seconds
      api: 'https://httpbin.org/post',
      type: 'ATLEAST_ONCE'
    });
    const jobId = createResponse.data.jobId;
    console.log('✅ Job created:', jobId);
    console.log('');

    // 3. Get job details
    console.log('3. Getting job details...');
    const jobDetails = await axios.get(`${BASE_URL}/jobs/${jobId}`);
    console.log('✅ Job details:', JSON.stringify(jobDetails.data, null, 2));
    console.log('');

    // 4. Wait a bit for executions
    console.log('4. Waiting 15 seconds for job executions...');
    await new Promise(resolve => setTimeout(resolve, 15000));

    // 5. Get job executions
    console.log('5. Getting job executions...');
    const executions = await axios.get(`${BASE_URL}/jobs/${jobId}/executions?limit=5`);
    console.log('✅ Executions:', JSON.stringify(executions.data, null, 2));
    console.log('');

    // 6. Get metrics
    console.log('6. Getting metrics...');
    const metrics = await axios.get(`${BASE_URL}/metrics`);
    console.log('✅ Metrics:', JSON.stringify(metrics.data, null, 2));
    console.log('');

    // 7. Update job
    console.log('7. Updating job...');
    await axios.put(`${BASE_URL}/jobs/${jobId}`, {
      schedule: '*/30 * * * * *', // Every 30 seconds
      api: 'https://httpbin.org/post',
      type: 'ATLEAST_ONCE'
    });
    console.log('✅ Job updated');
    console.log('');

    // 8. List all jobs
    console.log('8. Listing all jobs...');
    const allJobs = await axios.get(`${BASE_URL}/jobs`);
    console.log('✅ All jobs:', JSON.stringify(allJobs.data, null, 2));
    console.log('');

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAPI();

