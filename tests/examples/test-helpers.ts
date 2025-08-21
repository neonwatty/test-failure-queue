import { execSync, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const examplesPath = path.join(__dirname, '../..', 'examples');
export const tfqBin = path.join(__dirname, '../..', 'bin', 'tfq');

/**
 * Creates a temporary database path for testing
 */
export function createTempDbPath(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-test-'));
  return path.join(tempDir, 'test.db');
}

/**
 * Cleans up temporary database
 */
export function cleanupTempDb(tempDbPath: string): void {
  if (tempDbPath && fs.existsSync(tempDbPath)) {
    const tempDir = path.dirname(tempDbPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Helper function to run TFQ command and parse JSON output
 */
export function runTfqCommand(projectPath: string, args: string[], tempDbPath: string): any {
  // Build the full command - use the built CLI JavaScript
  const cliPath = path.join(__dirname, '../..', 'dist', 'cli.js');
  
  // Use spawnSync with node directly (no tsx needed for JS)
  // Try to find node in common locations
  const nodePath = fs.existsSync('/opt/homebrew/bin/node') 
    ? '/opt/homebrew/bin/node' 
    : fs.existsSync('/usr/local/bin/node') 
    ? '/usr/local/bin/node'
    : 'node';
    
  const result = spawnSync(nodePath, [cliPath, 'run-tests', ...args, '--json'], {
    cwd: projectPath,
    env: {
      ...process.env,
      TFQ_DB_PATH: tempDbPath,
      PATH: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'
    },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  
  // Check for errors
  if (result.error) {
    console.error('Command failed with error');
    console.error('Error:', result.error.message);
    console.error('Command:', nodePath, cliPath, 'run-tests', ...args, '--json');
    console.error('CWD:', projectPath);
    throw new Error(`TFQ command failed: ${result.error.message}`);
  }
  
  let output = result.stdout || '';
  
  if (!output && result.status !== 0) {
    console.error('Command failed with no output');
    console.error('Stderr:', result.stderr);
    console.error('Exit code:', result.status);
    console.error('CWD:', projectPath);
    throw new Error(`TFQ command failed with exit code ${result.status}`);
  }
  
  // Clean the output by finding the JSON
  let jsonStr = '';
  
  // Try to find JSON that starts with {"success"
  const jsonMatch = output.match(/\{"success"[^]*?\}(?=\s*$|\s*\n|$)/);
  
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  } else {
    // Fallback: look for any line that is pure JSON
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{"success"') && trimmed.endsWith('}')) {
        jsonStr = trimmed;
        break;
      }
    }
  }
  
  if (!jsonStr) {
    // Last resort: try to extract JSON by counting braces
    const startIdx = output.indexOf('{"success"');
    if (startIdx >= 0) {
      let braceCount = 0;
      let endIdx = -1;
      
      for (let i = startIdx; i < output.length; i++) {
        if (output[i] === '{') braceCount++;
        if (output[i] === '}') braceCount--;
        
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
      
      if (endIdx > startIdx) {
        jsonStr = output.substring(startIdx, endIdx);
      }
    }
  }
  
  if (!jsonStr) {
    console.error('Could not extract JSON from TFQ output');
    console.error('Output length:', output.length);
    console.error('First 500 chars:', output.substring(0, 500));
    console.error('Last 500 chars:', output.substring(Math.max(0, output.length - 500)));
    throw new Error('No valid JSON found in TFQ output');
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse JSON:');
    console.error('JSON string:', jsonStr);
    console.error('Parse error:', e);
    throw new Error(`Invalid JSON: ${e}`);
  }
}

/**
 * Helper function to check if pytest is available
 */
export function isPytestAvailable(): boolean {
  try {
    // Check if pytest is available in the Python project's venv
    const pythonProjectPath = path.join(examplesPath, 'python');
    const venvPython = path.join(pythonProjectPath, '.venv', 'bin', 'python');
    
    // First check if venv exists with pytest
    if (fs.existsSync(venvPython)) {
      execSync(`"${venvPython}" -m pytest --version`, { 
        stdio: 'ignore',
        encoding: 'utf8'
      });
      return true;
    }
    
    // Fallback to global pytest
    execSync('python3 -m pytest --version', { 
      stdio: 'ignore',
      encoding: 'utf8'
    });
    return true;
  } catch {
    return false;
  }
}