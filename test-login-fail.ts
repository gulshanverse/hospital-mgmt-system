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

async function test() {
  try {
    console.log('Testing Login with non-existent user...');
    await client.auth.login.mutate({
      email: 'non-existent-' + Date.now() + '@example.com',
      password: 'some-password'
    });
  } catch (error: any) {
    console.log('Response Status:', error.data?.httpStatus);
    console.log('Response Message:', error.message);
  }
}
test();
