'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ingestGithubUser } from '@/lib/githubIngestService';
import { storeIngestResult } from '@/lib/storageService';

/**
 * POST /api/github-ingest
 * 
 * Request body: { username: string }
 * 
 * Ingests a GitHub user's public repositories and their file structures.
 * Stores result locally in /data folder.
 * 
 * Returns: { success: boolean, data?: GithubIngestResult, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // Validate input
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid username parameter' },
        { status: 400 }
      );
    }

    if (username.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Username cannot be empty' },
        { status: 400 }
      );
    }

    // Fetch and ingest GitHub data
    const result = await ingestGithubUser(username.trim());

    // Store result locally
    if (result.status === 'success' || result.status === 'partial') {
      try {
        const filepath = await storeIngestResult(result);
        result.message = `Data stored at ${filepath}`;
      } catch (storageErr) {
        console.error('Storage error:', storageErr);
        result.message = 'Ingestion completed but storage failed';
        result.status = 'partial';
      }
    }

    const statusCode = result.status === 'success' ? 200 : result.status === 'partial' ? 207 : 400;

    return NextResponse.json({ success: result.status !== 'failed', data: result }, { status: statusCode });
  } catch (err: any) {
    console.error('POST /api/github-ingest error:', err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
