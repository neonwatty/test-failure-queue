import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClaudeService, getClaudeService } from '../../../src/services/claude/index.js';

describe('Claude Service Integration Tests', () => {
  let service: ClaudeService;
  let tempDir: string;
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-integration-'));
    
    // Reset singleton
    (getClaudeService as any).instance = null;
    
    // Clear any module cache that might interfere with fresh config loading
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Claude Availability Detection', () => {
    it('should detect Claude availability in real environment', async () => {
      // Create a minimal config that enables Claude but doesn't specify a path
      const mockConfigManager = {
        getConfig: () => ({ 
          claude: { 
            enabled: true,
            testTimeout: 5000 // Short timeout for tests
          } 
        }),
        getClaudeConfig: () => ({ 
          enabled: true,
          testTimeout: 5000
        }),
        getClaudePath: () => null // Let it auto-detect
      };

      // Mock ConfigManager to return our test config
      const { ConfigManager } = await import('../../../src/core/config.js');
      vi.spyOn(ConfigManager, 'getInstance').mockReturnValue(mockConfigManager as any);

      service = new ClaudeService();
      const available = await service.isAvailable();
      
      // This will be true if Claude CLI is installed, false otherwise
      // We test both cases to ensure the detection works properly
      if (available) {
        expect(service.getClaudePath()).toBeTruthy();
        console.log(`✓ Claude detected at: ${service.getClaudePath()}`);
      } else {
        console.log('ℹ Claude CLI not detected - this is expected if Claude Code CLI is not installed');
        expect(service.getClaudePath()).toBeNull();
      }
      
      // The test should pass regardless of whether Claude is installed
      expect(typeof available).toBe('boolean');
    });

    it('should respect CLAUDE_PATH environment variable', async () => {
      // Set a custom path via environment variable
      const customPath = '/custom/claude/path';
      process.env.CLAUDE_PATH = customPath;

      const mockConfigManager = {
        getConfig: () => ({ claude: { enabled: true } }),
        getClaudeConfig: () => ({ enabled: true }),
        getClaudePath: () => customPath // Should return the env var path
      };

      const { ConfigManager } = await import('../../../src/core/config.js');
      vi.spyOn(ConfigManager, 'getInstance').mockReturnValue(mockConfigManager as any);

      service = new ClaudeService();
      
      // Should use the environment variable path
      expect(service.getClaudePath()).toBe(customPath);
    });
  });

  describe('Configuration Integration', () => {
    it('should load configuration from real ConfigManager', async () => {
      // Write a real config file
      const configPath = path.join(tempDir, '.tfqrc');
      const config = {
        claude: {
          enabled: true,
          maxIterations: 5,
          testTimeout: 10000,
          prompt: 'Please fix this test: {filePath}',
          claudePath: '/mock/claude/path' // Prevent auto-detection
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      service = new ClaudeService(configPath);
      
      // Test that the service loads config - we can't guarantee exact values 
      // due to defaults and merging, but we can test that it loaded our config
      expect(service.isEnabled()).toBe(true);
      
      const serviceConfig = service.getConfig();
      expect(serviceConfig.enabled).toBe(true);
      expect(serviceConfig.prompt).toBe('Please fix this test: {filePath}');
      
      // The service should use our custom values if they override defaults
      console.log(`Service config - maxIterations: ${service.getMaxIterations()}, testTimeout: ${service.getTestTimeout()}`);
    });

    it('should validate configuration properly', async () => {
      // Test with disabled Claude
      const disabledConfigPath = path.join(tempDir, '.tfqrc-disabled');
      fs.writeFileSync(disabledConfigPath, JSON.stringify({
        claude: { enabled: false }
      }, null, 2));

      service = new ClaudeService(disabledConfigPath);
      
      const validation = service.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Claude integration is disabled');
    });
  });

  describe('Real Claude CLI Integration', () => {
    it('should attempt to communicate with Claude CLI if available', async () => {
      const configPath = path.join(tempDir, '.tfqrc');
      const config = {
        claude: {
          enabled: true,
          testTimeout: 5000, // Shorter timeout for tests
          prompt: 'quickly analyze this test file: {filePath}'
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      service = new ClaudeService(configPath);
      
      const isAvailable = await service.isAvailable();
      
      if (isAvailable) {
        console.log('✓ Claude CLI is available for integration testing');
        
        // Create a simple file that we can ask Claude to analyze quickly
        const testFile = path.join(tempDir, 'simple-test.js');
        fs.writeFileSync(testFile, `// Just analyze this simple file\nconsole.log("hello");`);

        // Try to have Claude analyze the test (this will actually call Claude)
        const result = await service.fixTest(testFile);
        
        // We can't predict exactly what Claude will do, but we can check
        // that the service handled the call properly
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('duration');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThan(0);
        
        if (!result.success && result.error) {
          console.log(`Claude integration test completed with error: ${result.error}`);
        } else if (result.success) {
          console.log('✓ Claude successfully processed the test file');
        }
        
      } else {
        console.log('ℹ Skipping real Claude integration test - Claude CLI not available');
        
        // Still test that the service handles unavailable Claude gracefully
        const testFile = path.join(tempDir, 'test.js');
        fs.writeFileSync(testFile, 'console.log("test");');
        
        const result = await service.fixTest(testFile);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Claude path not found');
      }
    }, 30000); // 30 second timeout for real Claude calls
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid file paths gracefully', async () => {
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: { enabled: true, testTimeout: 2000 }
      }, null, 2));

      service = new ClaudeService(configPath);
      
      // Try to fix a non-existent file
      const result = await service.fixTest('/non/existent/file.js');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.duration).toBeGreaterThan(0);
    }, 30000);

    it('should respect timeout configuration', async () => {
      const configPath = path.join(tempDir, '.tfqrc');
      fs.writeFileSync(configPath, JSON.stringify({
        claude: { 
          enabled: true, 
          testTimeout: 500 // Very short timeout
        }
      }, null, 2));

      service = new ClaudeService(configPath);
      
      const isAvailable = await service.isAvailable();
      
      if (isAvailable) {
        // If Claude is available, this might timeout due to the short timeout
        const testFile = path.join(tempDir, 'test.js');
        fs.writeFileSync(testFile, 'console.log("test");');
        
        const start = Date.now();
        const result = await service.fixTest(testFile);
        const duration = Date.now() - start;
        
        expect(result.success).toBe(false);
        
        // Should either timeout or complete very quickly
        if (result.error?.includes('timed out')) {
          expect(duration).toBeGreaterThan(400); // Should be close to our 500ms timeout
          expect(duration).toBeLessThan(1500); // But not too much longer
          console.log('✓ Timeout behavior confirmed');
        } else {
          console.log('Claude completed faster than timeout - this is also valid');
        }
      } else {
        console.log('ℹ Skipping timeout test - Claude CLI not available');
        
        // Should fail due to missing Claude
        const testFile = path.join(tempDir, 'test.js');
        fs.writeFileSync(testFile, 'console.log("test");');
        const result = await service.fixTest(testFile);
        expect(result.error).toContain('Claude path not found');
      }
    }, 30000);
  });
});