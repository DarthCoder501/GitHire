import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { GithubIngestResult } from '@/types/github';

const DATA_DIR = join(process.cwd(), 'data');

/**
 * Ensure the /data directory exists
 * Creates it if missing
 */
async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
    throw err;
  }
}

/**
 * Store ingestion result as JSON file locally
 * Filename format: {username}_{timestamp}.json
 * Returns the path to the saved file
 */
export async function storeIngestResult(result: GithubIngestResult): Promise<string> {
  try {
    await ensureDataDir();

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${result.username}_${timestamp}_${Date.now()}.json`;
    const filepath = join(DATA_DIR, filename);

    // Write JSON file
    await writeFile(filepath, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`Ingestion result stored at: ${filepath}`);

    return filepath;
  } catch (err) {
    console.error('Failed to store ingestion result:', err);
    throw err;
  }
}
