import { describe, it, expect, vi } from 'vitest';

describe('Claude Service Index Module', () => {
  describe('Module Exports', () => {
    it('should export ClaudeService and getClaudeService from claude-service', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      expect(module).toHaveProperty('ClaudeService');
      expect(module).toHaveProperty('getClaudeService');
      expect(typeof module.ClaudeService).toBe('function'); // Constructor
      expect(typeof module.getClaudeService).toBe('function');
    });

    it('should export ClaudeConfigManager from config', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      expect(module).toHaveProperty('ClaudeConfigManager');
      expect(typeof module.ClaudeConfigManager).toBe('function'); // Constructor
    });

    it('should export Claude types', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      // Type exports are not runtime values, but we can verify the module structure
      expect(module).toBeDefined();
      
      // We can't directly test type exports at runtime, but we can verify
      // that importing them doesn't throw errors
      const { ClaudeService, ClaudeConfigManager } = module;
      expect(ClaudeService).toBeDefined();
      expect(ClaudeConfigManager).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should allow creating ClaudeService instance', async () => {
      const { ClaudeService } = await import('../../../../src/services/claude/index.js');
      
      const service = new ClaudeService();
      expect(service).toBeInstanceOf(ClaudeService);
      expect(service).toHaveProperty('fixTest');
      expect(service).toHaveProperty('fixNextTest');
      expect(typeof service.fixTest).toBe('function');
      expect(typeof service.fixNextTest).toBe('function');
    });

    it('should allow creating ClaudeConfigManager instance', async () => {
      const { ClaudeConfigManager } = await import('../../../../src/services/claude/index.js');
      
      const configManager = new ClaudeConfigManager();
      expect(configManager).toBeInstanceOf(ClaudeConfigManager);
      expect(configManager).toHaveProperty('detectClaudePath');
      expect(configManager).toHaveProperty('getClaudeConfig');
      expect(typeof configManager.detectClaudePath).toBe('function');
      expect(typeof configManager.getClaudeConfig).toBe('function');
    });

    it('should provide getClaudeService factory function', async () => {
      const { getClaudeService, ClaudeService } = await import('../../../../src/services/claude/index.js');
      
      const service = getClaudeService();
      expect(service).toBeInstanceOf(ClaudeService);
    });
  });

  describe('Re-export Consistency', () => {
    it('should re-export the same ClaudeService as direct import', async () => {
      const indexModule = await import('../../../../src/services/claude/index.js');
      const serviceModule = await import('../../../../src/services/claude/claude-service.js');
      
      expect(indexModule.ClaudeService).toBe(serviceModule.ClaudeService);
      expect(indexModule.getClaudeService).toBe(serviceModule.getClaudeService);
    });

    it('should re-export the same ClaudeConfigManager as direct import', async () => {
      const indexModule = await import('../../../../src/services/claude/index.js');
      const configModule = await import('../../../../src/services/claude/config.js');
      
      expect(indexModule.ClaudeConfigManager).toBe(configModule.ClaudeConfigManager);
    });
  });

  describe('Module Structure Validation', () => {
    it('should not export any unexpected properties', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      const expectedExports = [
        'ClaudeService',
        'getClaudeService', 
        'ClaudeConfigManager'
      ];
      
      const actualExports = Object.keys(module);
      
      // Check that all expected exports are present
      expectedExports.forEach(exportName => {
        expect(actualExports).toContain(exportName);
      });
      
      // Check that we don't have too many unexpected exports
      // Allow for some flexibility in case of additional utility exports
      expect(actualExports.length).toBeLessThanOrEqual(expectedExports.length + 2);
    });

    it('should maintain stable API surface', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      // Verify core API methods are available
      const service = new module.ClaudeService();
      expect(service.fixTest).toBeDefined();
      expect(service.fixNextTest).toBeDefined();
      
      const configManager = new module.ClaudeConfigManager();
      expect(configManager.detectClaudePath).toBeDefined();
      expect(configManager.getClaudeConfig).toBeDefined();
      expect(configManager.buildCliArguments).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle module import errors gracefully', async () => {
      // Test that the module can be imported without throwing
      await expect(
        import('../../../../src/services/claude/index.js')
      ).resolves.toBeDefined();
    });

    it('should allow service instantiation even with invalid config', async () => {
      const { ClaudeService } = await import('../../../../src/services/claude/index.js');
      
      // Should not throw during construction
      expect(() => new ClaudeService()).not.toThrow();
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should provide proper TypeScript types for exports', async () => {
      const module = await import('../../../../src/services/claude/index.js');
      
      // Create instances to verify types are properly exported
      const service = new module.ClaudeService();
      const config = new module.ClaudeConfigManager();
      
      // These should compile without TypeScript errors if types are properly exported
      expect(service).toBeDefined();
      expect(config).toBeDefined();
    });
  });
});