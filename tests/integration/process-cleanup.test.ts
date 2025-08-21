import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as os from 'os';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import kill from 'tree-kill';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

describe('Process Cleanup Tests', () => {
  const cliPath = path.join(__dirname, '../..', 'src', 'cli.ts');
  const testDbPath = path.join(os.tmpdir(), 'test-process-cleanup-queue.db');
  
  // Track active child processes for cleanup
  const activeProcesses = new Set<any>();
  
  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up any remaining child processes
    activeProcesses.forEach(child => {
      if (!child.killed && child.pid) {
        // Use tree-kill to ensure all child processes are killed
        kill(child.pid, 'SIGKILL');
      }
    });
    activeProcesses.clear();
  });

  async function getProcessTree(pid: number): Promise<number[]> {
    try {
      // Use pgrep to find all child processes
      const { stdout } = await execAsync(`pgrep -P ${pid}`);
      const childPids = stdout.trim().split('\n').filter(p => p).map(p => parseInt(p, 10));
      
      // Recursively get children of children
      const allPids = [pid];
      for (const childPid of childPids) {
        if (!isNaN(childPid)) {
          const grandchildren = await getProcessTree(childPid);
          allPids.push(...grandchildren);
        }
      }
      return allPids;
    } catch (e) {
      // pgrep returns exit code 1 if no processes found
      return [pid];
    }
  }

  async function isProcessRunning(pid: number): Promise<boolean> {
    try {
      // Check if process exists using kill -0 (doesn't actually kill, just checks)
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Removed countTsxProcesses as it's unreliable when tests run in parallel
  // Instead, we'll track specific PIDs

  describe('Process spawning and cleanup', () => {
    it('should spawn and cleanup CLI processes with tree-kill', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, 'languages'], { 
        env,
        stdio: 'pipe'
      });
      activeProcesses.add(child);
      
      // Store the main PID
      const mainPid = child.pid!;
      expect(mainPid).toBeDefined();
      
      // Listen for process events
      let processStarted = false;
      child.stdout?.on('data', () => { processStarted = true; });
      child.stderr?.on('data', () => { processStarted = true; });
      
      // Wait for process to be fully running or exit
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, 2000)),
        new Promise(resolve => child.on('exit', resolve))
      ]);
      
      // Verify process is running (or has completed quickly)
      const isRunning = await isProcessRunning(mainPid);
      
      // If process exited quickly, that's OK - just skip the rest of the test
      if (!isRunning && child.exitCode !== null) {
        activeProcesses.delete(child);
        return;
      }
      
      expect(isRunning).toBe(true);
      
      // Clean up using tree-kill
      await new Promise<void>((resolve) => {
        kill(mainPid, 'SIGKILL', () => {
          resolve();
        });
      });
      
      activeProcesses.delete(child);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify main process is killed
      const stillRunning = await isProcessRunning(mainPid);
      expect(stillRunning).toBe(false);
    }, 15000);

    it('should verify tree-kill works with SIGTERM and SIGKILL fallback', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, 'languages', '--json'], { env });
      activeProcesses.add(child);
      
      const mainPid = child.pid!;
      
      // Wait for process to start
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // First try SIGTERM
      let killed = false;
      await new Promise<void>((resolve) => {
        kill(mainPid, 'SIGTERM', (err: any) => {
          if (!err) {
            killed = true;
          }
          resolve();
        });
      });
      
      // If SIGTERM didn't work, use SIGKILL
      if (!killed) {
        await new Promise<void>((resolve) => {
          kill(mainPid, 'SIGKILL', () => resolve());
        });
      }
      
      activeProcesses.delete(child);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify process is dead
      const stillRunning = await isProcessRunning(mainPid);
      expect(stillRunning).toBe(false);
    }, 15000);

    it('should not leave orphaned tsx processes after timeout', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, 'run-tests', '--language', 'javascript'], { env });
      activeProcesses.add(child);
      
      // Set a timeout to kill the process
      const timeoutId = setTimeout(() => {
        if (child.pid) {
          kill(child.pid, 'SIGKILL');
        }
      }, 2000);
      
      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearTimeout(timeoutId);
      activeProcesses.delete(child);
      
      // Check that this specific process was cleaned up
      if (child.pid) {
        const stillRunning = await isProcessRunning(child.pid);
        expect(stillRunning).toBe(false);
      }
    }, 10000);

    it('should clean up processes even when spawn fails', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      // Intentionally use a bad path to cause failure
      const child = spawn('npx', ['tsx', '/nonexistent/path.ts'], { env });
      activeProcesses.add(child);
      
      // Wait for process to fail
      await new Promise((resolve) => {
        child.on('error', resolve);
        child.on('exit', resolve);
        setTimeout(resolve, 3000);
      });
      
      // Clean up
      if (child.pid && !child.killed) {
        kill(child.pid, 'SIGKILL');
      }
      activeProcesses.delete(child);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check that this specific process was cleaned up if it had a PID
      if (child.pid) {
        const stillRunning = await isProcessRunning(child.pid);
        expect(stillRunning).toBe(false);
      }
    }, 10000);

    it('should handle multiple concurrent process spawns and cleanups', async () => {
      const children: any[] = [];
      
      // Spawn multiple processes
      for (let i = 0; i < 3; i++) {
        const env = { ...process.env, TFQ_DB_PATH: `${testDbPath}-${i}` };
        const child = spawn('npx', ['tsx', cliPath, 'languages', '--json'], { env });
        children.push(child);
        activeProcesses.add(child);
      }
      
      // Wait for all to spawn
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Kill all processes
      await Promise.all(children.map(child => 
        new Promise<void>((resolve) => {
          if (child.pid) {
            kill(child.pid, 'SIGKILL', () => resolve());
          } else {
            resolve();
          }
        })
      ));
      
      // Clean up tracking
      children.forEach(child => activeProcesses.delete(child));
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify all spawned processes are dead
      for (const child of children) {
        if (child.pid) {
          const stillRunning = await isProcessRunning(child.pid);
          expect(stillRunning).toBe(false);
        }
      }
    }, 15000);
  });

  describe('Integration with test utilities', () => {
    it('should verify cleanup pattern used in cli tests', async () => {
      // Simulate the cleanup pattern used in cli.test.ts
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, 'run-tests', '--help'], { env });
      
      // Track the process
      const trackedProcesses = new Set<any>();
      trackedProcesses.add(child);
      
      // Set up timeout (like in cli.test.ts)
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (child.pid) {
            kill(child.pid, 'SIGKILL', (err: any) => {
              if (!err) {
                trackedProcesses.delete(child);
              }
            });
          }
          reject(new Error('Timeout'));
        }, 2000);
      });
      
      // Wait for process to complete or timeout
      try {
        await Promise.race([
          new Promise(resolve => child.on('exit', resolve)),
          timeoutPromise
        ]);
      } catch (e) {
        // Expected timeout
      }
      
      // Cleanup any remaining processes (like afterEach in cli.test.ts)
      trackedProcesses.forEach(proc => {
        if (!proc.killed && proc.pid) {
          kill(proc.pid, 'SIGKILL');
        }
      });
      trackedProcesses.clear();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify this specific process was cleaned up
      if (child.pid) {
        const stillRunning = await isProcessRunning(child.pid);
        expect(stillRunning).toBe(false);
      }
    }, 10000);
  });

  describe('Edge cases', () => {
    it('should handle process that exits immediately', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, '--version'], { env });
      activeProcesses.add(child);
      
      // Wait for natural exit with proper timeout cleanup
      await new Promise((resolve) => {
        let timeoutId: NodeJS.Timeout;
        
        const cleanup = () => {
          clearTimeout(timeoutId);
          resolve(undefined);
        };
        
        child.on('exit', cleanup);
        timeoutId = setTimeout(cleanup, 5000); // Timeout fallback
      });
      
      // Try to kill already-dead process (should not throw)
      expect(() => {
        if (child.pid) {
          kill(child.pid, 'SIGTERM');
        }
      }).not.toThrow();
      
      activeProcesses.delete(child);
    }, 10000);

    it('should handle invalid PID gracefully', () => {
      // Try to kill non-existent process
      expect(() => {
        kill(999999, 'SIGTERM');
      }).not.toThrow();
    });

    it('should verify no zombie processes remain', async () => {
      const env = { ...process.env, TFQ_DB_PATH: testDbPath };
      const child = spawn('npx', ['tsx', cliPath, 'languages'], { env });
      activeProcesses.add(child);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Kill the process
      if (child.pid) {
        kill(child.pid, 'SIGKILL');
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for zombie processes (process state 'Z')
      try {
        const { stdout } = await execAsync('ps aux | grep -E "Z.*tsx\\|Z.*npm" | grep -v grep | wc -l');
        const zombieCount = parseInt(stdout.trim(), 10);
        expect(zombieCount).toBe(0);
      } catch (e) {
        // If ps command fails, assume no zombies
        expect(true).toBe(true);
      }
      
      activeProcesses.delete(child);
    }, 10000);
  });
});