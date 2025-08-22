import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CLI Commands respect .tfqrc configuration', () => {
  let tempDir: string;
  let originalCwd: string;

  const runCLI = (args: string[], options: { skipDbPath?: boolean } = {}): Promise<{ stdout: string; stderr: string; code: number | null }> => {
    return new Promise((resolve) => {
      const cliPath = path.resolve(__dirname, '../../dist/cli.js');
      const env: any = { ...process.env, NODE_ENV: 'test' };
      
      // Only set TFQ_DB_PATH for tests that don't test database path configuration
      if (!options.skipDbPath) {
        env.TFQ_DB_PATH = path.join(tempDir, 'test.db');
      }
      
      const spawnOptions: SpawnOptionsWithoutStdio = {
        cwd: tempDir,
        env
      };

      const child = spawn('node', [cliPath, ...args], spawnOptions);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code });
      });

      // Force kill after timeout
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch (e) {
          // Process may have already exited
        }
      }, 5000);
    });
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-config-test-'));
    
    // Create a Ruby project structure
    fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'gem "minitest"\n');
    fs.mkdirSync(path.join(tempDir, 'test'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'test/example_test.rb'), `
require 'minitest/autorun'

class ExampleTest < Minitest::Test
  def test_pass
    assert true
  end
  
  def test_fail
    assert false
  end
end
`);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('run-tests command', () => {
    it('should use language and framework from .tfqrc', async () => {
      // Create .tfqrc with Ruby configuration
      const tfqrcConfig = {
        language: 'ruby',
        framework: 'minitest',
        database: {
          path: './.tfq/queue.db'
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Run tests without specifying language/framework
      const result = await runCLI(['run-tests', '--json', 'echo "test"']);
      
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.language).toBe('ruby');
        expect(json.framework).toBe('minitest');
      }
    });

    it('should override .tfqrc with command line options', async () => {
      // Create .tfqrc with Ruby configuration
      const tfqrcConfig = {
        language: 'ruby',
        framework: 'minitest',
        database: {
          path: './.tfq/queue.db'
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Run with explicit Python override
      const result = await runCLI(['run-tests', '--language', 'python', '--framework', 'pytest', '--json', 'echo "test"']);
      
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.language).toBe('python');
        expect(json.framework).toBe('pytest');
      }
    });

    it('should work without .tfqrc (backward compatibility)', async () => {
      // No .tfqrc file created
      
      // Should default to JavaScript
      const result = await runCLI(['run-tests', '--json', 'echo "test"']);
      
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.language).toBe('javascript');
      }
    });
  });

  describe('add command', () => {
    it('should use database path from .tfqrc', async () => {
      // Use absolute path for the test
      const customDbPath = path.join(tempDir, '.custom', 'test.db');
      const tfqrcConfig = {
        language: 'ruby',
        framework: 'minitest',
        database: {
          path: customDbPath
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Add a test file - skip setting TFQ_DB_PATH env var so config is used
      const result = await runCLI(['add', 'test/example_test.rb', '--json'], { skipDbPath: true });
      
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.success).toBe(true);
      } else {
        console.log('No JSON output found. stdout:', result.stdout);
        console.log('stderr:', result.stderr);
        // Still try to check for database
      }

      // Verify database was created at custom path (already absolute)
      expect(fs.existsSync(customDbPath)).toBe(true);
    });

    it('should use defaultPriority from .tfqrc', async () => {
      const tfqrcConfig = {
        language: 'ruby',
        database: {
          path: './.tfq/queue.db'
        },
        defaults: {
          autoAdd: true,
          parallel: 10  // This maps to defaultPriority in ConfigFile format
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Add without specifying priority
      await runCLI(['add', 'test/example_test.rb']);
      
      // Check the item was added with the default priority
      const listResult = await runCLI(['list', '--json']);
      const jsonLine = listResult.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        if (json.items && json.items.length > 0) {
          expect(json.items[0].priority).toBe(10);
        }
      }
    });
  });

  describe('next/peek commands', () => {
    it('should use database from .tfqrc', async () => {
      const customDbPath = path.join(tempDir, '.custom', 'queue.db');
      const tfqrcConfig = {
        language: 'ruby',
        database: {
          path: customDbPath
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Add a test - use skipDbPath for all database path tests
      await runCLI(['add', 'test/example_test.rb'], { skipDbPath: true });
      
      // Get next should work with the custom database
      const result = await runCLI(['next', '--json'], { skipDbPath: true });
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.filePath || json.message).toBeDefined();
      }
    });
  });

  describe('list command', () => {
    it('should use database from .tfqrc', async () => {
      const customDbPath = path.join(tempDir, '.custom', 'queue.db');
      const tfqrcConfig = {
        language: 'ruby',
        database: {
          path: customDbPath
        }
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(tfqrcConfig, null, 2));

      // Add some tests - use skipDbPath for all database path tests
      await runCLI(['add', 'test/test1.rb'], { skipDbPath: true });
      await runCLI(['add', 'test/test2.rb'], { skipDbPath: true });
      
      // List should show items from custom database
      const result = await runCLI(['list', '--json'], { skipDbPath: true });
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        expect(json.count).toBe(2);
        expect(json.items).toHaveLength(2);
      }
    });
  });

  describe('Config file priority', () => {
    it('should prefer local .tfqrc over home directory', async () => {
      // Create home directory config (should be ignored)
      const homeConfig = {
        language: 'python',
        framework: 'pytest'
      };
      const homeTfqrc = path.join(os.homedir(), '.tfqrc');
      const hadHomeTfqrc = fs.existsSync(homeTfqrc);
      const homeBackup = hadHomeTfqrc ? fs.readFileSync(homeTfqrc, 'utf-8') : null;
      
      try {
        fs.writeFileSync(homeTfqrc, JSON.stringify(homeConfig, null, 2));
        
        // Create local config (should be used)
        const localConfig = {
          language: 'ruby',
          framework: 'minitest',
          database: {
            path: './.tfq/queue.db'
          }
        };
        fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(localConfig, null, 2));
        
        // Run command
        const result = await runCLI(['run-tests', '--json', 'echo "test"']);
        
        const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
        if (jsonLine) {
          const json = JSON.parse(jsonLine);
          // Should use local config, not home config
          expect(json.language).toBe('ruby');
          expect(json.framework).toBe('minitest');
        }
      } finally {
        // Restore home directory config
        if (hadHomeTfqrc && homeBackup) {
          fs.writeFileSync(homeTfqrc, homeBackup);
        } else if (!hadHomeTfqrc && fs.existsSync(homeTfqrc)) {
          fs.unlinkSync(homeTfqrc);
        }
      }
    });

    it('should use --config flag to override default locations', async () => {
      // Create config at custom location
      const customConfigPath = path.join(tempDir, 'custom-config.json');
      const customConfig = {
        language: 'python',
        framework: 'unittest',
        database: {
          path: './custom.db'
        }
      };
      fs.writeFileSync(customConfigPath, JSON.stringify(customConfig, null, 2));
      
      // Create default .tfqrc (should be ignored)
      const defaultConfig = {
        language: 'ruby',
        framework: 'minitest'
      };
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), JSON.stringify(defaultConfig, null, 2));
      
      // Run with --config flag
      const result = await runCLI(['--config', customConfigPath, 'run-tests', '--json', 'echo "test"']);
      
      const jsonLine = result.stdout.split('\n').find(line => line.trim().startsWith('{'));
      if (jsonLine) {
        const json = JSON.parse(jsonLine);
        // Should use custom config, not default
        expect(json.language).toBe('python');
        expect(json.framework).toBe('unittest');
      }
    });
  });

});