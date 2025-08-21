import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { 
  examplesPath, 
  createTempDbPath, 
  cleanupTempDb 
} from './test-helpers';

describe('Demo and Reset Scripts', () => {
  let tempDbPath: string;

  beforeEach(() => {
    tempDbPath = createTempDbPath();
  });

  afterEach(() => {
    cleanupTempDb(tempDbPath);
  });

  it('should have executable demo and reset scripts for JavaScript', () => {
    const projectPath = path.join(examplesPath, 'javascript');
    const demoScript = path.join(projectPath, 'demo.sh');
    const resetScript = path.join(projectPath, 'reset.sh');
    
    expect(fs.existsSync(demoScript)).toBe(true);
    expect(fs.existsSync(resetScript)).toBe(true);
    
    // Check if scripts are executable
    const demoStats = fs.statSync(demoScript);
    const resetStats = fs.statSync(resetScript);
    
    // Check that files exist and have execute permission
    expect(demoStats.mode & 0o111).toBeTruthy();
    expect(resetStats.mode & 0o111).toBeTruthy();
  });

  it('should have executable demo and reset scripts for TypeScript', () => {
    const projectPath = path.join(examplesPath, 'typescript');
    const demoScript = path.join(projectPath, 'demo.sh');
    const resetScript = path.join(projectPath, 'reset.sh');
    
    expect(fs.existsSync(demoScript)).toBe(true);
    expect(fs.existsSync(resetScript)).toBe(true);
    
    const demoStats = fs.statSync(demoScript);
    const resetStats = fs.statSync(resetScript);
    
    expect(demoStats.mode & 0o111).toBeTruthy();
    expect(resetStats.mode & 0o111).toBeTruthy();
  });

  it('should have executable demo and reset scripts for Ruby', () => {
    const projectPath = path.join(examplesPath, 'ruby');
    const demoScript = path.join(projectPath, 'demo.sh');
    const resetScript = path.join(projectPath, 'reset.sh');
    
    expect(fs.existsSync(demoScript)).toBe(true);
    expect(fs.existsSync(resetScript)).toBe(true);
    
    const demoStats = fs.statSync(demoScript);
    const resetStats = fs.statSync(resetScript);
    
    expect(demoStats.mode & 0o111).toBeTruthy();
    expect(resetStats.mode & 0o111).toBeTruthy();
  });

  it('should have executable demo and reset scripts for Python', () => {
    const projectPath = path.join(examplesPath, 'python');
    const demoScript = path.join(projectPath, 'demo.sh');
    const resetScript = path.join(projectPath, 'reset.sh');
    
    expect(fs.existsSync(demoScript)).toBe(true);
    expect(fs.existsSync(resetScript)).toBe(true);
    
    const demoStats = fs.statSync(demoScript);
    const resetStats = fs.statSync(resetScript);
    
    expect(demoStats.mode & 0o111).toBeTruthy();
    expect(resetStats.mode & 0o111).toBeTruthy();
  });

  it('should reset JavaScript project to buggy state correctly', () => {
    const projectPath = path.join(examplesPath, 'javascript');
    
    // Run reset script
    execSync('./reset.sh', { 
      cwd: projectPath,
      env: { ...process.env, TFQ_DB_PATH: tempDbPath }
    });
    
    // Verify the calculator has been reset to buggy state
    const calculatorContent = fs.readFileSync(
      path.join(projectPath, 'src', 'calculator.js'), 
      'utf8'
    );
    
    // Check for intentional bugs
    expect(calculatorContent).toContain('return 17;'); // multiply bug
    // Check that average method doesn't validate empty arrays (bug)
    expect(calculatorContent).toContain('// BUG: Doesn\'t handle empty arrays properly');
    expect(calculatorContent).not.toContain('if (!Array.isArray(numbers) || numbers.length === 0)');
  });

  it('should reset TypeScript project to buggy state correctly', () => {
    const projectPath = path.join(examplesPath, 'typescript');
    
    // Run reset script
    execSync('./reset.sh', { 
      cwd: projectPath,
      env: { ...process.env, TFQ_DB_PATH: tempDbPath }
    });
    
    // Verify the calculator has been reset to buggy state
    const calculatorContent = fs.readFileSync(
      path.join(projectPath, 'src', 'calculator.ts'), 
      'utf8'
    );
    
    // Check for intentional bugs
    expect(calculatorContent).toContain('return Infinity;'); // divide bug
    expect(calculatorContent).toContain('return NaN;'); // sqrt bug
  });
});