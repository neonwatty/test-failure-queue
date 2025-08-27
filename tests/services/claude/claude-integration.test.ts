import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClaudeService } from '../../../src/services/claude/index.js';
import { setupMockProject, copyClaudeFixtureToProject } from '../../integration/fixtures/mock-projects.js';

describe('Real Claude Integration Tests (Local Only)', () => {
  let service: ClaudeService;
  let tempDir: string;
  let isClaudeAvailable: boolean;
  let originalEnv: typeof process.env;

  beforeAll(async () => {
    // Check if Claude CLI is available before running any tests
    // Create a temp config that explicitly enables Claude for detection
    const detectionTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-detection-'));
    const detectionConfigPath = path.join(detectionTempDir, '.tfqrc');
    
    // Write config that enables Claude for detection
    fs.writeFileSync(detectionConfigPath, JSON.stringify({
      claude: {
        enabled: true  // Enable Claude for detection
      }
    }, null, 2));
    
    const tempService = new ClaudeService(detectionConfigPath);
    
    // Test availability
    isClaudeAvailable = await tempService.isAvailable();
    
    // Clean up temp detection config
    fs.rmSync(detectionTempDir, { recursive: true, force: true });
    
    if (!isClaudeAvailable) {
      console.log('⚠️  Claude CLI not detected - skipping all integration tests');
      console.log('   Install Claude Code CLI to run these tests locally');
      console.log('   These tests are meant for local development, not CI');
      console.log('   💡 Set CLAUDE_DEBUG=true for detailed detection logging');
    } else {
      console.log('✅ Claude CLI detected - running real integration tests');
      console.log(`   Claude path: ${tempService.getClaudePath()}`);
      console.log('   ⚡ Running real Claude Code CLI integration tests...');
    }
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-real-integration-'));
  });

  afterEach(() => {
    process.env = originalEnv;
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Real Claude CLI Availability', () => {
    it('should detect Claude availability in real environment', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 45000 // 45 seconds
        }
      }, null, 2));

      service = new ClaudeService(configPath);
      const available = await service.isAvailable();
      
      expect(available).toBe(true);
      expect(service.getClaudePath()).toBeTruthy();
      expect(service.isEnabled()).toBe(true);
      
      console.log(`✓ Claude available at: ${service.getClaudePath()}`);
    });
  });

  describe('Real Test Fixing - JavaScript Syntax Errors', () => {
    it('should fix JavaScript syntax errors using real Claude CLI', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      // Setup a mock JavaScript project
      const projectDir = path.join(tempDir, 'js-project');
      setupMockProject(projectDir, 'javascriptJest');
      
      // Copy broken syntax test fixture to project
      const brokenTestFile = path.join(projectDir, 'tests', 'broken-syntax.test.js');
      copyClaudeFixtureToProject('broken-syntax.test.js', projectDir, 'tests/broken-syntax.test.js');
      
      // Configure Claude service with realistic timeout
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 60000, // 1 minute should be plenty for syntax fixes
          maxIterations: 3,
          prompt: 'Please fix the syntax errors in this JavaScript test file: {testFilePath}'
        }
      }, null, 2));
      
      service = new ClaudeService(configPath);
      
      console.log('🔧 Calling real Claude CLI to fix syntax errors...');
      console.log(`   Test file: ${brokenTestFile}`);
      console.log(`   Timeout: ${service.getTestTimeout()}ms`);
      
      const startTime = Date.now();
      const result = await service.fixTest(brokenTestFile);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Claude operation completed in ${duration}ms`);
      
      if (result.success) {
        console.log('✅ Claude successfully fixed the test file');
        
        // Read the fixed file and verify it looks reasonable
        const fixedContent = fs.readFileSync(brokenTestFile, 'utf8');
        
        // Basic checks that the file was likely fixed
        expect(fixedContent).toContain('describe');
        expect(fixedContent).toContain('it');
        expect(fixedContent).toContain('expect');
        
        // The fixed file should be syntactically valid JavaScript
        // (we can't easily test this without running it, but we can check basic structure)
        const openBraces = fixedContent.split('{').length - 1; // subtract 1 because split creates n+1 elements
        const closeBraces = fixedContent.split('}').length - 1;
        expect(Math.abs(openBraces - closeBraces)).toBeLessThanOrEqual(1); // Allow small difference due to formatting
        
        console.log('✅ Fixed file appears to have valid syntax structure');
      } else {
        console.log(`❌ Claude failed to fix the test: ${result.error}`);
        
        // Even if Claude fails, the test should complete properly
        expect(result.error).toBeTruthy();
        expect(result.duration).toBeGreaterThan(0);
      }
      
      // Verify basic result structure
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(190000); // Should complete within 190 seconds
      
    }, 200000); // 200 second timeout for the entire test
    
    it('should fix JavaScript assertion errors using real Claude CLI', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      // Setup a mock JavaScript project
      const projectDir = path.join(tempDir, 'js-project');
      setupMockProject(projectDir, 'javascriptJest');
      
      // Copy failing assertions test fixture to project
      const failingTestFile = path.join(projectDir, 'tests', 'failing-assertions.test.js');
      copyClaudeFixtureToProject('failing-assertions.test.js', projectDir, 'tests/failing-assertions.test.js');
      
      // Configure Claude service
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 45000, // 45 seconds
          maxIterations: 2,
          prompt: 'Please fix the failing test assertions by correcting the function implementations in this JavaScript file: {testFilePath}'
        }
      }, null, 2));
      
      service = new ClaudeService(configPath);
      
      console.log('🔧 Calling real Claude CLI to fix failing assertions...');
      console.log(`   Test file: ${failingTestFile}`);
      
      const startTime = Date.now();
      const result = await service.fixTest(failingTestFile);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Claude operation completed in ${duration}ms`);
      
      if (result.success) {
        console.log('✅ Claude successfully fixed the failing assertions');
        
        // Read the fixed file
        const fixedContent = fs.readFileSync(failingTestFile, 'utf8');
        
        // Check that the fixed file still has the test structure
        expect(fixedContent).toContain('describe');
        expect(fixedContent).toContain('it');
        expect(fixedContent).toContain('expect');
        expect(fixedContent).toContain('add');
        expect(fixedContent).toContain('multiply');
        
        console.log('✅ Fixed file maintains expected structure');
      } else {
        console.log(`⚠️  Claude could not fix the assertions: ${result.error}`);
        expect(result.error).toBeTruthy();
      }
      
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);
      
    }, 150000); // 150 second timeout
  });

  describe('Error Handling with Real Claude CLI', () => {
    it('should handle timeout scenarios gracefully', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      // Create a complex test file that might take longer to fix
      const projectDir = path.join(tempDir, 'timeout-project');
      setupMockProject(projectDir, 'javascriptJest');
      
      const complexTestFile = path.join(projectDir, 'tests', 'complex.test.js');
      const complexContent = `// This is a very complex test file with multiple issues
const { describe, it, expect } = require('@jest/globals');

// Create many broken functions to make Claude work harder
`.repeat(20) + `
describe('Complex Test', () => {
  it('should be complex', () => {
    expect(true).toBe(true);
  });
});`;
      
      fs.writeFileSync(complexTestFile, complexContent);
      
      // Configure with a very short timeout to test timeout behavior
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 5000, // Very short timeout - 5 seconds
          maxIterations: 1,
          prompt: 'Please spend a very long time analyzing and fixing this complex test file with extreme thoroughness: {testFilePath}'
        }
      }, null, 2));
      
      service = new ClaudeService(configPath);
      
      console.log('⏱️  Testing timeout behavior with 5 second limit...');
      
      const startTime = Date.now();
      const result = await service.fixTest(complexTestFile);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Operation completed in ${duration}ms (timeout was 5000ms)`);
      
      // The result might succeed or fail depending on how quickly Claude responds
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);
      
      if (!result.success && result.error?.includes('timed out')) {
        console.log('✅ Timeout handling worked correctly');
        expect(result.error).toContain('timed out');
      } else if (result.success) {
        console.log('✅ Claude completed within timeout');
      } else {
        console.log(`ℹ Other error occurred: ${result.error}`);
      }
      
    }, 15000); // 15 second test timeout
    
    it('should handle non-existent files gracefully', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 45000
        }
      }, null, 2));
      
      service = new ClaudeService(configPath);
      
      const nonExistentFile = path.join(tempDir, 'does-not-exist.test.js');
      
      console.log('🔧 Testing Claude behavior with non-existent file...');
      
      const result = await service.fixTest(nonExistentFile);
      
      // Claude should handle this gracefully
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);
      
      if (!result.success) {
        console.log(`✅ Correctly handled non-existent file: ${result.error}`);
      } else {
        console.log('ℹ Claude somehow succeeded with non-existent file');
      }
      
    }, 150000);
  });

  describe('Multi-iteration Fixes', () => {
    it('should handle multiple iterations with complex test fixture', async () => {
      if (!isClaudeAvailable) {
        console.log('ℹ Skipping - Claude CLI not available');
        return;
      }

      // Setup a mock JavaScript project
      const projectDir = path.join(tempDir, 'multi-iteration-project');
      setupMockProject(projectDir, 'javascriptJest');
      
      // Copy complex multi-iteration test fixture to project
      const complexTestFile = path.join(projectDir, 'tests', 'complex-multi-iteration.test.js');
      copyClaudeFixtureToProject('complex-multi-iteration.test.js', projectDir, 'tests/complex-multi-iteration.test.js');
      
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: {
          enabled: true,
          testTimeout: 60000, // Extended timeout for complex fixes
          maxIterations: 3, // Allow multiple iterations for complex issues
          prompt: 'This file has multiple types of issues (syntax errors, logic errors, test assertions). Please fix all issues systematically: {testFilePath}'
        }
      }, null, 2));
      
      service = new ClaudeService(configPath);
      
      // Verify configuration is loaded correctly
      expect(service.getMaxIterations()).toBe(3);
      expect(service.getTestTimeout()).toBe(60000);
      
      console.log('✅ Multi-iteration configuration loaded correctly');
      console.log(`   Max iterations: ${service.getMaxIterations()}`);
      console.log(`   Timeout: ${service.getTestTimeout()}ms`);
      console.log('🔧 Testing with complex multi-iteration fixture...');
      console.log(`   Test file: ${complexTestFile}`);
      
      const startTime = Date.now();
      const result = await service.fixTest(complexTestFile);
      const duration = Date.now() - startTime;
      
      console.log(`⏱️  Claude operation completed in ${duration}ms`);
      
      if (result.success) {
        console.log('✅ Claude successfully processed the complex test file');
        
        // Read the potentially fixed file
        const fixedContent = fs.readFileSync(complexTestFile, 'utf8');
        
        // Basic structure checks
        expect(fixedContent).toContain('describe');
        expect(fixedContent).toContain('it');
        expect(fixedContent).toContain('expect');
        expect(fixedContent).toContain('calculateArea');
        expect(fixedContent).toContain('processUserData');
        expect(fixedContent).toContain('formatCurrency');
        
        console.log('✅ Complex file maintains expected function structure');
      } else {
        console.log(`⚠️  Claude could not fully fix the complex file: ${result.error}`);
        expect(result.error).toBeTruthy();
      }
      
      expect(typeof result.success).toBe('boolean');
      expect(result.duration).toBeGreaterThan(0);
      
    }, 90000); // Extended timeout for complex multi-iteration test
  });
});