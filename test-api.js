// Simple API test script
const API_BASE_URL = 'http://localhost:3001/api';

async function testAPI() {
  console.log('🧪 Testing Library Volunteer Hub API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.status);

    // Test 2: Login
    console.log('\n2. Testing login...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@school.edu',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData.user.name);
    const token = loginData.token;

    // Test 3: Get announcements
    console.log('\n3. Testing announcements...');
    const announcementsResponse = await fetch(`${API_BASE_URL}/announcements`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!announcementsResponse.ok) {
      throw new Error(`Announcements failed: ${announcementsResponse.status}`);
    }
    
    const announcements = await announcementsResponse.json();
    console.log('✅ Announcements retrieved:', announcements.length, 'items');

    // Test 4: Get volunteers
    console.log('\n4. Testing volunteers...');
    const volunteersResponse = await fetch(`${API_BASE_URL}/users/volunteers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!volunteersResponse.ok) {
      throw new Error(`Volunteers failed: ${volunteersResponse.status}`);
    }
    
    const volunteers = await volunteersResponse.json();
    console.log('✅ Volunteers retrieved:', volunteers.length, 'volunteers');

    // Test 5: Get check-in code
    console.log('\n5. Testing check-in code...');
    const checkinResponse = await fetch(`${API_BASE_URL}/checkin/code`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!checkinResponse.ok) {
      throw new Error(`Check-in code failed: ${checkinResponse.status}`);
    }
    
    const checkinData = await checkinResponse.json();
    console.log('✅ Check-in code retrieved:', checkinData.code);

    // Test 6: Get tasks
    console.log('\n6. Testing tasks...');
    const tasksResponse = await fetch(`${API_BASE_URL}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!tasksResponse.ok) {
      throw new Error(`Tasks failed: ${tasksResponse.status}`);
    }
    
    const tasks = await tasksResponse.json();
    console.log('✅ Tasks retrieved:', tasks.length, 'tasks');

    // Test 7: Get shifts
    console.log('\n7. Testing shifts...');
    const today = new Date().toISOString().split('T')[0];
    const shiftsResponse = await fetch(`${API_BASE_URL}/shifts/week/${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!shiftsResponse.ok) {
      throw new Error(`Shifts failed: ${shiftsResponse.status}`);
    }
    
    const shifts = await shiftsResponse.json();
    console.log('✅ Shifts retrieved:', shifts.length, 'shifts');

    console.log('\n🎉 All API tests passed! The backend is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the frontend: npm run dev');
    console.log('   2. Open http://localhost:5173');
    console.log('   3. Login with admin@school.edu / password123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Make sure PostgreSQL is running');
    console.log('   2. Check if backend is running: npm run backend:dev');
    console.log('   3. Verify database setup: npm run db:push && npm run db:seed');
  }
}

// Run the test
testAPI();