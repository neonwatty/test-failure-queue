import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CLI init command', () => {
  let tempDir: string;
  const cliPath = path.join(process.cwd(), 'dist', 'cli.js');

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tfq-init-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Clean up and restore working directory
    process.chdir(path.dirname(tempDir));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const runCommand = (args: string = ''): string => {
    try {
      const output = execSync(`node ${cliPath} init ${args}`, {
        encoding: 'utf-8',
        env: { ...process.env, TFQ_DB_PATH: undefined }
      });
      return output;
    } catch (error: any) {
      throw new Error(`Command failed: ${error.message}\nOutput: ${error.stdout}\nError: ${error.stderr}`);
    }
  };

  describe('basic initialization', () => {
    it('should create .tfqrc file with default configuration', () => {
      runCommand();
      
      const configPath = path.join(tempDir, '.tfqrc');
      expect(fs.existsSync(configPath)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(config.database?.path).toBe('./.tfq/tfq.db');
      expect(config.defaults?.autoAdd).toBe(true);
      expect(config.defaults?.parallel).toBe(4);
    });

    it('should detect JavaScript project', () => {
      // Create package.json
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', version: '1.0.0' })
      );
      
      const output = runCommand();
      expect(output).toContain('javascript');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.language).toBe('javascript');
    });

    it('should detect Python project', () => {
      // Create requirements.txt
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest\n');
      
      const output = runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.language).toBe('python');
    });

    it('should detect Ruby project', () => {
      // Create Gemfile
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'source "https://rubygems.org"\ngem "rspec"\n');
      
      const output = runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.language).toBe('ruby');
    });
  });

  describe('custom options', () => {
    it('should use custom database path', () => {
      runCommand('--db-path ./custom/db/path.db');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.database?.path).toBe('./custom/db/path.db');
    });

    it('should use CI configuration', () => {
      runCommand('--ci');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.database?.path).toBe('/tmp/tfq-tfq.db');
    });

    it('should create shared configuration', () => {
      runCommand('--shared');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.database?.path).toBe('./.tfq/shared-tfq.db');
    });

    it('should output JSON when --json flag is used', () => {
      const output = runCommand('--json');
      
      const result = JSON.parse(output);
      expect(result.success).toBe(true);
      expect(result.configPath).toContain('.tfqrc');
      expect(result.config).toBeDefined();
    });
  });

  describe('gitignore handling', () => {
    it('should add .tfq/ to gitignore in git repository', () => {
      // Initialize git repo
      execSync('git init', { cwd: tempDir });
      
      runCommand();
      
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(true);
      
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      expect(gitignoreContent).toContain('.tfq/');
      expect(gitignoreContent).toContain('# TFQ test failure queue database');
    });

    it('should not create gitignore if not a git repository', () => {
      runCommand();
      
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(false);
    });

    it('should skip gitignore with --no-gitignore flag', () => {
      execSync('git init', { cwd: tempDir });
      
      runCommand('--no-gitignore');
      
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(fs.existsSync(gitignorePath)).toBe(false);
    });

    it('should not duplicate .tfq/ entry in existing gitignore', () => {
      execSync('git init', { cwd: tempDir });
      fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n.tfq/\n');
      
      runCommand();
      
      const gitignoreContent = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
      const tfqMatches = gitignoreContent.match(/\.tfq\//g);
      expect(tfqMatches?.length).toBe(1);
    });
  });

  describe('workspace mode', () => {
    it('should detect npm workspaces', () => {
      // Create package.json with workspaces
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'monorepo',
          workspaces: ['packages/app', 'packages/lib']
        })
      );
      
      runCommand('--workspace-mode');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.workspaces).toBeDefined();
      expect(config.workspaces?.['packages/app']).toBe('./.tfq/app-tfq.db');
      expect(config.workspaces?.['packages/lib']).toBe('./.tfq/lib-tfq.db');
    });

    it('should initialize with scope for sub-project', () => {
      const subDir = path.join(tempDir, 'packages', 'app');
      fs.mkdirSync(subDir, { recursive: true });
      
      runCommand(`--scope ${subDir}`);
      
      const configPath = path.join(subDir, '.tfqrc');
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should fail if .tfqrc already exists', () => {
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), '{}');
      
      expect(() => runCommand()).toThrow();
    });

    it('should overwrite existing config with --ci flag', () => {
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), '{"old": true}');
      
      runCommand('--ci');
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.old).toBeUndefined();
      expect(config.database?.path).toBe('/tmp/tfq-tfq.db');
    });

    it('should handle JSON output for errors', () => {
      fs.writeFileSync(path.join(tempDir, '.tfqrc'), '{}');
      
      let output = '';
      try {
        output = execSync(`node ${cliPath} init --json`, {
          encoding: 'utf-8',
          env: { ...process.env, TFQ_DB_PATH: undefined }
        });
      } catch (error: any) {
        output = error.stdout;
      }
      
      const result = JSON.parse(output);
      expect(result.success).toBe(false);
      expect(result.error).toContain('.tfqrc already exists');
    });
  });

  describe('framework detection', () => {
    it('should detect Vitest for JavaScript', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { vitest: '^1.0.0' }
        })
      );
      fs.writeFileSync(path.join(tempDir, 'vitest.config.js'), 'export default {}');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('vitest');
    });

    it('should detect Jest for JavaScript', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { jest: '^29.0.0' }
        })
      );
      fs.writeFileSync(path.join(tempDir, 'jest.config.js'), 'module.exports = {}');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('jest');
    });

    it('should detect pytest for Python', () => {
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest==7.4.0\n');
      fs.writeFileSync(path.join(tempDir, 'pytest.ini'), '[pytest]\ntestpaths = tests\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('pytest');
    });

    it('should detect RSpec for Ruby', () => {
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'gem "rspec"\n');
      fs.writeFileSync(path.join(tempDir, '.rspec'), '--require spec_helper\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('rspec');
    });

    it('should detect Minitest for Ruby', () => {
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'gem "minitest"\n');
      fs.mkdirSync(path.join(tempDir, 'test'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'test/test_helper.rb'), 'require "minitest/autorun"\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('minitest');
    });

    it('should detect Minitest for Rails projects', () => {
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'gem "rails"\ngem "minitest"\n');
      fs.mkdirSync(path.join(tempDir, 'config'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'config/application.rb'), 'module MyApp\nend\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.framework).toBe('minitest');
    });
  });

  describe('Language priority detection', () => {
    it('should prefer Ruby over JavaScript when both Gemfile and package.json exist', () => {
      // Create both Gemfile and package.json
      fs.writeFileSync(path.join(tempDir, 'Gemfile'), 'source "https://rubygems.org"\ngem "rspec"\n');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "frontend", "version": "1.0.0"}\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.language).toBe('ruby');
      expect(config.framework).toBe('rspec');
    });

    it('should prefer Python over JavaScript when both requirements.txt and package.json exist', () => {
      // Create both requirements.txt and package.json
      fs.writeFileSync(path.join(tempDir, 'requirements.txt'), 'pytest==7.4.0\n');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name": "frontend", "version": "1.0.0"}\n');
      
      runCommand();
      
      const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.tfqrc'), 'utf-8'));
      expect(config.language).toBe('python');
    });
  });
});