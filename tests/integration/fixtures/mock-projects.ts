import fs from 'fs';
import path from 'path';

export interface MockProject {
  files: Record<string, string>;
  directories: string[];
}

export const mockProjects: Record<string, MockProject> = {
  javascriptJest: {
    directories: ['src', 'tests', 'node_modules'],
    files: {
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        scripts: {
          test: 'jest'
        },
        devDependencies: {
          jest: '^27.5.1',
          '@types/jest': '^27.4.1'
        }
      }, null, 2),
      'jest.config.js': `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests']
};`
    }
  },
  
  javascriptMocha: {
    directories: ['src', 'test', 'node_modules'],
    files: {
      'package.json': JSON.stringify({
        name: 'mocha-project',
        version: '1.0.0',
        scripts: {
          test: 'mocha'
        },
        devDependencies: {
          mocha: '^10.0.0',
          chai: '^4.3.6'
        }
      }, null, 2),
      '.mocharc.json': JSON.stringify({
        spec: 'test/**/*.test.js',
        timeout: 5000
      }, null, 2)
    }
  },
  
  javascriptVitest: {
    directories: ['src', 'tests'],
    files: {
      'package.json': JSON.stringify({
        name: 'vitest-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          test: 'vitest'
        },
        devDependencies: {
          vitest: '^0.34.0',
          vite: '^4.4.0'
        }
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node'
  }
});`
    }
  },
  
  rubyRails: {
    directories: ['app', 'test', 'config', 'db'],
    files: {
      'Gemfile': `source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.0.0'

gem 'rails', '~> 7.0.0'
gem 'sqlite3', '~> 1.4'
gem 'puma', '~> 5.0'

group :development, :test do
  gem 'byebug', platforms: [:mri, :mingw, :x64_mingw]
end

group :test do
  gem 'minitest', '~> 5.15'
  gem 'minitest-reporters'
end`,
      'Gemfile.lock': '# Gemfile.lock content',
      'Rakefile': `require_relative 'config/application'
Rails.application.load_tasks`,
      'config/application.rb': `require 'rails'
module TestApp
  class Application < Rails::Application
    config.load_defaults 7.0
  end
end`
    }
  },
  
  pythonPytest: {
    directories: ['src', 'tests', '__pycache__'],
    files: {
      'requirements.txt': `pytest==7.3.1
pytest-cov==4.0.0
pytest-mock==3.10.0`,
      'setup.py': `from setuptools import setup, find_packages

setup(
    name='test-project',
    version='1.0.0',
    packages=find_packages(),
    install_requires=[],
    extras_require={
        'test': ['pytest>=7.0.0']
    }
)`,
      'pytest.ini': `[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*`
    }
  },
  
  pythonUnittest: {
    directories: ['src', 'test'],
    files: {
      'requirements.txt': 'unittest2==1.1.0',
      'setup.py': `from setuptools import setup

setup(
    name='unittest-project',
    version='1.0.0',
    packages=['src'],
    test_suite='test'
)`,
      'test/__init__.py': '',
      'test/test_main.py': `import unittest

class TestMain(unittest.TestCase):
    def test_example(self):
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()`
    }
  },
  
  mixedLanguage: {
    directories: ['frontend', 'backend', 'tests'],
    files: {
      'package.json': JSON.stringify({
        name: 'frontend',
        scripts: { test: 'jest' },
        devDependencies: { jest: '^27.0.0' }
      }, null, 2),
      'Gemfile': 'gem "minitest"',
      'requirements.txt': 'pytest==7.0.0',
      'frontend/package.json': JSON.stringify({
        name: 'frontend-app',
        devDependencies: { vitest: '^0.34.0' }
      }, null, 2),
      'backend/Gemfile': 'gem "minitest"'
    }
  },
  
  noTestFramework: {
    directories: ['src', 'lib'],
    files: {
      'README.md': '# Project without test framework',
      'index.js': 'console.log("Hello World");'
    }
  }
};

export function setupMockProject(projectPath: string, projectType: keyof typeof mockProjects): void {
  const project = mockProjects[projectType];
  
  // Create directories
  project.directories.forEach(dir => {
    const dirPath = path.join(projectPath, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });
  
  // Create files
  Object.entries(project.files).forEach(([filePath, content]) => {
    const fullPath = path.join(projectPath, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
  });
}

export function cleanupMockProject(projectPath: string): void {
  if (fs.existsSync(projectPath)) {
    fs.rmSync(projectPath, { recursive: true, force: true });
  }
}

export const expectedDetections = {
  javascriptJest: { language: 'javascript', framework: 'jest' },
  javascriptMocha: { language: 'javascript', framework: 'mocha' },
  javascriptVitest: { language: 'javascript', framework: 'vitest' },
  rubyRails: { language: 'ruby', framework: 'minitest' },
  pythonPytest: { language: 'python', framework: 'pytest' },
  pythonUnittest: { language: 'python', framework: 'unittest' },
  mixedLanguage: { language: 'javascript', framework: 'jest' }, // Should detect root package.json first
  noTestFramework: { language: null, framework: null }
};