import { NextRequest, type NextFetchEvent } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { protect } = vi.hoisted(() => ({ protect: vi.fn() }));

vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/nextjs/server')>();

  return {
    ...actual,
    clerkMiddleware:
      (handler: (auth: { protect: typeof protect }, request: NextRequest) => Promise<void>) =>
      async (request: NextRequest) =>
        handler({ protect }, request),
  };
});

describe('middleware cron route boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'pk_live_test');
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_live_test');
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lets the daily briefing scheduler reach its bearer-authorized route without a Clerk session', async () => {
    const { default: middleware } = await import('../../middleware');

    await middleware(
      new NextRequest('https://piccnewyork.org/api/cron/daily-briefing'),
      {} as NextFetchEvent,
    );

    expect(protect).not.toHaveBeenCalled();
  });
});
