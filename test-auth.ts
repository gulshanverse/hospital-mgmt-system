import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './server/routers';
import superjson from 'superjson';
import fetch from 'node-fetch';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://jeevanos.up.railway.app/api/trpc',
      transformer: superjson,
      fetch: fetch as any,
    }),
  ],
});

async function runTests() {
  console.log('--- Starting Authentication Tests ---');
  
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';
  const fullName = 'Test User';

  try {
    // 1. Register
    console.log('1. Testing Registration (Receptionist)...');
    const regResult = await client.auth.register.mutate({
      email,
      password,
      fullName,
      role: 'receptionist'
    });
    console.log('✅ Registration successful:', regResult.user.email);

    const tokens = regResult.tokens;

    // 2. Login
    console.log('2. Testing Login...');
    const loginResult = await client.auth.login.mutate({
      email,
      password
    });
    console.log('✅ Login successful:', loginResult.user.email);

    // 3. Protected Route (Me)
    console.log('3. Testing Protected Route (me)...');
    const authClient = createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: 'https://jeevanos.up.railway.app/api/trpc',
          transformer: superjson,
          fetch: fetch as any,
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        }),
      ],
    });
    const meResult = await authClient.auth.me.query();
    console.log('✅ Auth Me successful:', meResult.email);

    // 4. Refresh Token
    console.log('4. Testing Token Refresh...');
    const refreshResult = await client.auth.refresh.mutate({
      refreshToken: tokens.refreshToken
    });
    console.log('✅ Token refresh successful');

    // 5. Logout
    console.log('5. Testing Logout...');
    const logoutResult = await authClient.auth.logout.mutate();
    console.log('✅ Logout successful');

    console.log('--- All Tests Passed! ---');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
