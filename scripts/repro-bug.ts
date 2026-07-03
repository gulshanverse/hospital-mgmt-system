import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';

const API_URL = 'http://localhost:3000/api/trpc';

function getClient(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: API_URL,
        transformer: superjson,
        headers() {
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

async function runRepro() {
  console.log('Running RBAC Bug Reproduction...');
  
  const client = getClient();
  
  // 1. Login as Admin
  // The seed script uses 'admin@hms.com' / 'Password123!'
  console.log('Attempting login as admin@hms.com...');
  let loginRes;
  try {
    loginRes = await client.auth.login.mutate({ 
      email: 'admin@hms.com', 
      password: 'Password123!' 
    });
  } catch (e: any) {
    console.error('Login failed. Make sure the database is seeded and the server is running.');
    console.error(JSON.stringify(e, null, 2));
    process.exit(1);
  }
  
  const adminToken = loginRes.tokens.accessToken;
  const adminId = loginRes.user.id;
  
  console.log(`Logged in as: ${loginRes.user.fullName} (Role: ${loginRes.user.role})`);
  
  if (loginRes.user.role !== 'admin') {
    console.error(`Initial user is not admin! Role is: ${loginRes.user.role}`);
    process.exit(1);
  }

  const api = getClient(adminToken);

  // 2. Create a Doctor Profile for the Admin
  console.log('Creating Doctor Profile for Admin...');
  try {
    const depts = await api.department.list.query();
    if (depts.length === 0) {
      console.error('No departments found. Seed the database.');
      process.exit(1);
    }
    const deptId = depts[0].id;
    
    await api.doctor.create.mutate({
      userId: adminId,
      departmentId: deptId,
      specialty: 'General Medicine',
      qualification: 'MD',
      experience: 10,
      licenseNumber: `LIC-ADMIN-${Date.now()}`,
    });
    console.log('Doctor Profile created.');
  } catch (e: any) {
    console.error(`Failed to create doctor profile: ${e.message}`);
    // If it already exists, we can still check the role
    if (!e.message.includes('already has a doctor profile')) {
       process.exit(1);
    }
  }

  // 3. Check role again
  const profileRes = await api.auth.me.query();
  console.log(`Current role after profile creation: ${profileRes.role}`);
  
  if (profileRes.role === 'doctor') {
    console.log('❌ BUG REPRODUCED: Admin role was overwritten by doctor!');
  } else if (profileRes.role === 'admin') {
    console.log('✅ BUG NOT PRESENT: Admin role preserved.');
  } else {
    console.log(`Unknown role: ${profileRes.role}`);
  }
}

runRepro().catch(console.error);
