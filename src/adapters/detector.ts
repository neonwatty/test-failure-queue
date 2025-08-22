import fs from 'fs';
import path from 'path';
import { TestLanguage, TestFramework } from '../core/types.js';

export interface DetectionResult {
  language: TestLanguage;
  framework: TestFramework | null;
  confidence: number; // 0-100
}

export interface FrameworkDetection {
  framework: TestFramework;
  confidence: number;
}

export class EnhancedDetector {
  detectProject(projectPath: string = process.cwd()): DetectionResult | null {
    // Try to detect language first
    const language = this.detectLanguage(projectPath);
    if (!language) {
      return null;
    }

    // Then detect framework for that language
    const framework = this.detectFramework(language, projectPath);
    
    return {
      language,
      framework,
      confidence: framework ? 90 : 70
    };
  }

  private detectLanguage(projectPath: string): TestLanguage | null {
    const detections: Array<{ language: TestLanguage; confidence: number }> = [];

    // Check for language-specific files
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      detections.push({ language: 'javascript', confidence: 100 });
    }
    if (fs.existsSync(path.join(projectPath, 'Gemfile'))) {
      detections.push({ language: 'ruby', confidence: 100 });
    }
    
    const pythonIndicators = [
      'requirements.txt', 'setup.py', 'pyproject.toml', 
      'Pipfile', 'poetry.lock'
    ];
    for (const indicator of pythonIndicators) {
      if (fs.existsSync(path.join(projectPath, indicator))) {
        detections.push({ language: 'python', confidence: 100 });
        break;
      }
    }

    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      detections.push({ language: 'go', confidence: 100 });
    }
    if (fs.existsSync(path.join(projectPath, 'pom.xml')) || 
        fs.existsSync(path.join(projectPath, 'build.gradle'))) {
      detections.push({ language: 'java', confidence: 100 });
    }

    // Return highest confidence detection
    if (detections.length > 0) {
      return detections.sort((a, b) => b.confidence - a.confidence)[0].language;
    }

    // Fall back to file extension detection
    return this.detectLanguageByExtensions(projectPath);
  }

  private detectLanguageByExtensions(projectPath: string): TestLanguage | null {
    const extensionMap: Record<string, TestLanguage> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'javascript',
      '.tsx': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      '.rb': 'ruby',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java'
    };

    const counts: Record<TestLanguage, number> = {
      javascript: 0,
      ruby: 0,
      python: 0,
      go: 0,
      java: 0
    };

    try {
      this.countFilesByExtension(projectPath, extensionMap, counts);
      
      let maxCount = 0;
      let detectedLanguage: TestLanguage | null = null;
      
      for (const [language, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          detectedLanguage = language as TestLanguage;
        }
      }
      
      return detectedLanguage;
    } catch (error) {
      return null;
    }
  }

  private countFilesByExtension(
    dir: string, 
    extensionMap: Record<string, TestLanguage>,
    counts: Record<TestLanguage, number>,
    depth: number = 0
  ): void {
    if (depth > 3) return; // Don't go too deep

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.countFilesByExtension(fullPath, extensionMap, counts, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const language = extensionMap[ext];
        if (language) {
          counts[language]++;
        }
      }
    }
  }

  private detectFramework(language: TestLanguage, projectPath: string): TestFramework | null {
    switch (language) {
      case 'javascript':
        return this.detectJavaScriptFramework(projectPath);
      case 'python':
        return this.detectPythonFramework(projectPath);
      case 'ruby':
        return this.detectRubyFramework(projectPath);
      case 'go':
        return 'go'; // Go has built-in testing
      case 'java':
        return this.detectJavaFramework(projectPath);
      default:
        return null;
    }
  }

  private detectJavaScriptFramework(projectPath: string): TestFramework | null {
    const detections: FrameworkDetection[] = [];

    // Check for framework-specific config files
    if (fs.existsSync(path.join(projectPath, 'vitest.config.js')) ||
        fs.existsSync(path.join(projectPath, 'vitest.config.ts')) ||
        fs.existsSync(path.join(projectPath, 'vite.config.js')) ||
        fs.existsSync(path.join(projectPath, 'vite.config.ts'))) {
      detections.push({ framework: 'vitest', confidence: 100 });
    }

    if (fs.existsSync(path.join(projectPath, 'jest.config.js')) ||
        fs.existsSync(path.join(projectPath, 'jest.config.ts')) ||
        fs.existsSync(path.join(projectPath, 'jest.config.json'))) {
      detections.push({ framework: 'jest', confidence: 100 });
    }

    if (fs.existsSync(path.join(projectPath, '.mocharc.js')) ||
        fs.existsSync(path.join(projectPath, '.mocharc.json')) ||
        fs.existsSync(path.join(projectPath, 'mocha.opts'))) {
      detections.push({ framework: 'mocha', confidence: 100 });
    }

    if (fs.existsSync(path.join(projectPath, 'jasmine.json')) ||
        fs.existsSync(path.join(projectPath, 'spec/support/jasmine.json'))) {
      detections.push({ framework: 'jasmine', confidence: 100 });
    }

    if (fs.existsSync(path.join(projectPath, 'ava.config.js')) ||
        fs.existsSync(path.join(projectPath, 'ava.config.cjs'))) {
      detections.push({ framework: 'ava', confidence: 100 });
    }

    // Check package.json for dependencies
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (deps.vitest) detections.push({ framework: 'vitest', confidence: 90 });
        if (deps.jest) detections.push({ framework: 'jest', confidence: 90 });
        if (deps.mocha) detections.push({ framework: 'mocha', confidence: 90 });
        if (deps.jasmine) detections.push({ framework: 'jasmine', confidence: 90 });
        if (deps.ava) detections.push({ framework: 'ava', confidence: 90 });

        // Check test script
        const testScript = packageJson.scripts?.test || '';
        if (testScript.includes('vitest')) {
          detections.push({ framework: 'vitest', confidence: 95 });
        } else if (testScript.includes('jest')) {
          detections.push({ framework: 'jest', confidence: 95 });
        } else if (testScript.includes('mocha')) {
          detections.push({ framework: 'mocha', confidence: 95 });
        } else if (testScript.includes('jasmine')) {
          detections.push({ framework: 'jasmine', confidence: 95 });
        } else if (testScript.includes('ava')) {
          detections.push({ framework: 'ava', confidence: 95 });
        }
      } catch (error) {
        // Ignore parse errors
      }
    }

    // Return highest confidence detection
    if (detections.length > 0) {
      return detections.sort((a, b) => b.confidence - a.confidence)[0].framework;
    }

    return null;
  }

  private detectPythonFramework(projectPath: string): TestFramework | null {
    const detections: FrameworkDetection[] = [];

    // Check for framework-specific config files
    if (fs.existsSync(path.join(projectPath, 'pytest.ini')) ||
        fs.existsSync(path.join(projectPath, 'setup.cfg')) ||
        fs.existsSync(path.join(projectPath, 'tox.ini'))) {
      // Check if these files mention pytest
      try {
        const files = ['pytest.ini', 'setup.cfg', 'tox.ini'];
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('pytest') || content.includes('[tool:pytest]')) {
              detections.push({ framework: 'pytest', confidence: 100 });
              break;
            }
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check pyproject.toml
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    if (fs.existsSync(pyprojectPath)) {
      try {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        if (content.includes('[tool.pytest')) {
          detections.push({ framework: 'pytest', confidence: 100 });
        }
        if (content.includes('unittest')) {
          detections.push({ framework: 'unittest', confidence: 80 });
        }
        if (content.includes('nose2')) {
          detections.push({ framework: 'nose2', confidence: 80 });
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check requirements files
    const requirementFiles = ['requirements.txt', 'requirements-dev.txt', 'test-requirements.txt'];
    for (const reqFile of requirementFiles) {
      const reqPath = path.join(projectPath, reqFile);
      if (fs.existsSync(reqPath)) {
        try {
          const content = fs.readFileSync(reqPath, 'utf-8');
          if (content.includes('pytest')) {
            detections.push({ framework: 'pytest', confidence: 90 });
          }
          if (content.includes('nose2')) {
            detections.push({ framework: 'nose2', confidence: 90 });
          }
          if (content.includes('django') && !detections.find(d => d.framework === 'django')) {
            detections.push({ framework: 'django', confidence: 85 });
          }
        } catch (error) {
          // Ignore read errors
        }
      }
    }

    // Check for Django
    if (fs.existsSync(path.join(projectPath, 'manage.py'))) {
      detections.push({ framework: 'django', confidence: 95 });
    }

    // Check for test file patterns
    try {
      const hasTestPy = this.findFilesWithPattern(projectPath, /test_.*\.py$/);
      const hasTestDir = fs.existsSync(path.join(projectPath, 'tests')) || 
                         fs.existsSync(path.join(projectPath, 'test'));
      
      if (hasTestPy || hasTestDir) {
        // Default to pytest if we see test files but no specific framework
        if (detections.length === 0) {
          detections.push({ framework: 'pytest', confidence: 70 });
        }
      }
    } catch (error) {
      // Ignore errors
    }

    // Return highest confidence detection
    if (detections.length > 0) {
      return detections.sort((a, b) => b.confidence - a.confidence)[0].framework;
    }

    return 'pytest'; // Default for Python
  }

  private detectRubyFramework(projectPath: string): TestFramework | null {
    const detections: FrameworkDetection[] = [];

    // Check for RSpec
    if (fs.existsSync(path.join(projectPath, '.rspec')) ||
        fs.existsSync(path.join(projectPath, 'spec'))) {
      detections.push({ framework: 'rspec', confidence: 100 });
    }

    // Check for Rails (which typically uses Minitest)
    if (fs.existsSync(path.join(projectPath, 'config/application.rb')) ||
        fs.existsSync(path.join(projectPath, 'Rakefile'))) {
      // Check if it's a Rails app
      try {
        const rakefilePath = path.join(projectPath, 'Rakefile');
        if (fs.existsSync(rakefilePath)) {
          const content = fs.readFileSync(rakefilePath, 'utf-8');
          if (content.includes('Rails.application')) {
            detections.push({ framework: 'minitest', confidence: 90 });
          }
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check Gemfile
    const gemfilePath = path.join(projectPath, 'Gemfile');
    if (fs.existsSync(gemfilePath)) {
      try {
        const content = fs.readFileSync(gemfilePath, 'utf-8');
        if (content.includes('rspec')) {
          detections.push({ framework: 'rspec', confidence: 95 });
        }
        if (content.includes('minitest')) {
          detections.push({ framework: 'minitest', confidence: 95 });
        }
        if (content.includes('cucumber')) {
          detections.push({ framework: 'cucumber', confidence: 95 });
        }
        if (content.includes('test-unit')) {
          detections.push({ framework: 'test-unit', confidence: 95 });
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check for test directory patterns
    if (fs.existsSync(path.join(projectPath, 'test'))) {
      detections.push({ framework: 'minitest', confidence: 70 });
    }

    // Return highest confidence detection
    if (detections.length > 0) {
      return detections.sort((a, b) => b.confidence - a.confidence)[0].framework;
    }

    return 'minitest'; // Default for Ruby
  }

  private detectJavaFramework(projectPath: string): TestFramework | null {
    const detections: FrameworkDetection[] = [];

    // Check pom.xml for Maven projects
    const pomPath = path.join(projectPath, 'pom.xml');
    if (fs.existsSync(pomPath)) {
      try {
        const content = fs.readFileSync(pomPath, 'utf-8');
        if (content.includes('junit-jupiter') || content.includes('junit5')) {
          detections.push({ framework: 'junit5', confidence: 100 });
        } else if (content.includes('junit')) {
          detections.push({ framework: 'junit', confidence: 100 });
        }
        if (content.includes('testng')) {
          detections.push({ framework: 'testng', confidence: 100 });
        }
      } catch (error) {
        // Ignore read errors
      }
    }

    // Check build.gradle for Gradle projects
    const gradlePath = path.join(projectPath, 'build.gradle');
    const gradleKtsPath = path.join(projectPath, 'build.gradle.kts');
    
    for (const buildFile of [gradlePath, gradleKtsPath]) {
      if (fs.existsSync(buildFile)) {
        try {
          const content = fs.readFileSync(buildFile, 'utf-8');
          if (content.includes('junit-jupiter') || content.includes('junit5')) {
            detections.push({ framework: 'junit5', confidence: 100 });
          } else if (content.includes('junit')) {
            detections.push({ framework: 'junit', confidence: 100 });
          }
          if (content.includes('testng')) {
            detections.push({ framework: 'testng', confidence: 100 });
          }
        } catch (error) {
          // Ignore read errors
        }
      }
    }

    // Return highest confidence detection
    if (detections.length > 0) {
      return detections.sort((a, b) => b.confidence - a.confidence)[0].framework;
    }

    return 'junit'; // Default for Java
  }

  private findFilesWithPattern(dir: string, pattern: RegExp, depth: number = 0): boolean {
    if (depth > 2) return false; // Don't go too deep

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isFile() && pattern.test(entry.name)) {
          return true;
        }

        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          if (this.findFilesWithPattern(fullPath, pattern, depth + 1)) {
            return true;
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return false;
  }
}