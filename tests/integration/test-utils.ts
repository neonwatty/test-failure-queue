import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Track running child processes for cleanup
const runningProcesses = new Set<ChildProcess>();

// Cleanup function for process termination
export async function killChildProcesses(): Promise<void> {
  const killPromises = Array.from(runningProcesses).map(async (process) => {
    if (!process.killed) {
      return new Promise<void>((resolve) => {
        process.on('exit', () => resolve());
        process.kill('SIGTERM');
        
        // Force kill after 2 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
    }
  });
  
  await Promise.all(killPromises);
  runningProcesses.clear();
}

/**
 * Create a temporary test directory in OS temp folder instead of tests/ folder
 */
export function createTestDirectory(prefix: string = 'tfq-integration'): string {
  const testId = Date.now().toString();
  return path.join(os.tmpdir(), `${prefix}-${testId}`);
}

/**
 * Enhanced cleanup function with retry logic and proper error handling
 */
export async function cleanupTestDirectory(testDir: string, maxRetries: number = 5): Promise<void> {
  // First kill any child processes that might be holding file locks
  await killChildProcesses();
  
  // Then attempt to clean up the directory with retries
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(testDir)) {
        // Try to make directory writable in case of permission issues
        try {
          fs.chmodSync(testDir, 0o755);
          // Recursively make all contents writable
          const makeWritable = (dir: string) => {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
              const itemPath = path.join(dir, item);
              const stat = fs.statSync(itemPath);
              if (stat.isDirectory()) {
                fs.chmodSync(itemPath, 0o755);
                makeWritable(itemPath);
              } else {
                fs.chmodSync(itemPath, 0o644);
              }
            });
          };
          makeWritable(testDir);
        } catch (permError) {
          // Continue even if we can't change permissions
        }
        
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      return; // Success
    } catch (error) {
      if (i === maxRetries - 1) {
        // Final attempt failed
        throw new Error(`Failed to cleanup test directory after ${maxRetries} attempts: ${testDir}. Error: ${error}`);
      }
      
      // Wait with exponential backoff before retrying
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Enhanced command runner with proper process tracking and cleanup
 */
export async function runTfqCommand(
  args: string[], 
  cwd: string, 
  timeout: number = 10000
): Promise<{ success: boolean; output: string; error: string }> {
  return new Promise((resolve) => {
    // Ensure the working directory exists
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const tfqPath = path.resolve(__dirname, '../../dist/cli.js');
    
    // Use absolute config path to avoid cwd resolution issues
    const configPath = path.join(cwd, '.tfqrc');
    const argsWithConfig = args.includes('--config') ? args : ['--config', configPath, ...args];
    
    const child = spawn('node', [tfqPath, ...argsWithConfig], {
      cwd,
      stdio: 'pipe',
      env: { 
        ...process.env, 
        NODE_ENV: 'test',
        // Force the process to use our test directory as cwd
        PWD: cwd
      }
    });

    // Track this process for cleanup
    runningProcesses.add(child);

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      runningProcesses.delete(child);
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      });
    });

    child.on('error', (error) => {
      runningProcesses.delete(child);
      resolve({
        success: false,
        output: stdout,
        error: stderr + `\nSpawn error: ${error.message}`
      });
    });

    // Set a timeout to prevent hanging
    const timeoutHandle = setTimeout(() => {
      runningProcesses.delete(child);
      child.kill('SIGTERM');
      
      // Force kill after 2 seconds if SIGTERM doesn't work
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      }, 2000);
      
      resolve({
        success: false,
        output: stdout,
        error: stderr + `\nTimeout: Command took longer than ${timeout}ms`
      });
    }, timeout);

    child.on('close', () => {
      clearTimeout(timeoutHandle);
    });
  });
}

/**
 * Setup function for integration tests
 */
export async function setupIntegrationTest(testName: string): Promise<{
  testDir: string;
  cleanup: () => Promise<void>;
}> {
  const testDir = createTestDirectory(testName);
  
  // Create test directory and database directory
  fs.mkdirSync(testDir, { recursive: true });
  fs.mkdirSync(path.join(testDir, '.tfq'), { recursive: true });
  
  // Create a default config with Claude disabled for testing
  const config = {
    database: {
      path: path.resolve(path.join(testDir, '.tfq/test.db'))
    },
    language: 'javascript',
    framework: 'vitest',
    claude: {
      enabled: false // Disable Claude for integration tests by default
    }
  };
  fs.writeFileSync(path.join(testDir, '.tfqrc'), JSON.stringify(config, null, 2));
  
  // Small delay to ensure file system operations are complete
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return {
    testDir,
    cleanup: async () => {
      await cleanupTestDirectory(testDir);
    }
  };
}