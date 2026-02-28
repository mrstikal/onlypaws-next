import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Cron endpoint for cleanup of old sessions
 *
 * Vercel Cron setup:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 *
 * Or call manually with CRON_SECRET in Authorization header
 */
export async function GET(req: Request) {
  // Verify that request comes from Vercel Cron or has the correct secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production we require authorization
  if (process.env.NODE_ENV === 'production') {
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    // Delete sessions older than 30 days
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    const result = await prisma.sessions.deleteMany({
      where: {
        last_activity: { lt: thirtyDaysAgo }
      }
    });

    console.log(`[Cron] Cleaned up ${result.count} old sessions`);

    return NextResponse.json({
      ok: true,
      deleted: result.count,
      message: `Deleted ${result.count} old sessions`
    });
  } catch (error) {
    console.error('[Cron] Session cleanup failed:', error);

    return NextResponse.json(
      {
        error: 'Cleanup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also allow POST for flexibility
export const POST = GET;

