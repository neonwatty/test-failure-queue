import { TestRunner } from '../src/test-runner';
import { execSync } from 'child_process';
import { adapterRegistry } from '../src/adapters/registry';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('child_process');
jest.mock('fs');

describe('TestRunner - Multi-Language Integration', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Ruby Language Support', () => {
    it('should run Minitest tests and extract failures', () => {
      const minitestOutput = `
Run options: --seed 12345

# Running:

..F.E..

Failure:
UserTest#test_validation [test/models/user_test.rb:45]:
Expected false to be truthy.

Error:
UserTest#test_creation:
NoMethodError: undefined method 'save' for nil:NilClass
    test/models/user_test.rb:23:in 'test_creation'

Finished in 0.125s, 56.0000 runs/s, 48.0000 assertions/s.

7 runs, 6 assertions, 1 failures, 1 errors, 0 skips
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = minitestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({
        language: 'ruby',
        framework: 'minitest',
        command: 'rails test'
      });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
      expect(result.failingTests).toContain('test/models/user_test.rb:45');
      expect(result.failingTests).toContain('test/models/user_test.rb:23');
      expect(result.totalFailures).toBe(2);
    });

    it('should run RSpec tests and extract failures', () => {
      const rspecOutput = `
.F.F..

Failures:

  1) User validation validates presence of email
     Failure/Error: expect(user).to be_valid
     
       expected #<User id: nil> to be valid, but got errors:
         Email can't be blank
     # ./spec/models/user_spec.rb:10:in 'block (3 levels) in <top (required)>'

  2) API authentication returns 401 for invalid token
     Failure/Error: expect(response.status).to eq(401)
     
       expected: 401
            got: 200
     
     # ./spec/requests/api_spec.rb:25:in 'block (3 levels) in <top (required)>'

Finished in 0.34521 seconds (files took 1.23 seconds to load)
6 examples, 2 failures

Failed examples:

rspec ./spec/models/user_spec.rb:10
rspec ./spec/requests/api_spec.rb:25
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = rspecOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({
        language: 'ruby',
        framework: 'rspec'
      });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.failingTests).toContain('./spec/models/user_spec.rb:10');
      expect(result.failingTests).toContain('./spec/requests/api_spec.rb:25');
      expect(result.totalFailures).toBe(2);
    });
  });

  describe('Python Language Support', () => {
    it('should run pytest tests and extract failures', () => {
      const pytestOutput = `
============================= test session starts ==============================
platform linux -- Python 3.9.7, pytest-7.1.2, pluggy-1.0.0
rootdir: /home/user/project
collected 10 items

tests/test_auth.py ..F.                                                   [ 40%]
tests/test_api.py .F..                                                    [ 80%]
tests/test_utils.py ..                                                    [100%]

=================================== FAILURES ===================================
_______________________________ test_validation ________________________________

    def test_validation():
        user = User(email='')
>       assert user.is_valid()
E       AssertionError: assert False
E        +  where False = <bound method User.is_valid of <User: >>()
E        +    where <bound method User.is_valid of <User: >> = <User: >.is_valid

tests/test_auth.py:15: AssertionError
________________________________ test_api_call _________________________________

    def test_api_call():
        response = api.get('/users')
>       assert response.status_code == 200
E       assert 404 == 200
E        +  where 404 = <Response [404]>.status_code

tests/test_api.py:23: AssertionError
=========================== short test summary info ============================
FAILED tests/test_auth.py::test_validation
FAILED tests/test_api.py::test_api_call
========================= 2 failed, 8 passed in 0.45s ==========================
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = pytestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({
        language: 'python',
        framework: 'pytest'
      });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.failingTests).toContain('tests/test_auth.py::test_validation');
      expect(result.failingTests).toContain('tests/test_api.py::test_api_call');
      expect(result.totalFailures).toBe(2);
    });

    it('should run unittest tests and extract failures', () => {
      const unittestOutput = `
..F.E..
======================================================================
ERROR: test_creation (test_models.TestUser)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_models.py", line 23, in test_creation
    user.save()
AttributeError: 'NoneType' object has no attribute 'save'

======================================================================
FAIL: test_validation (test_models.TestUser)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_models.py", line 45, in test_validation
    self.assertTrue(user.is_valid())
AssertionError: False is not true

----------------------------------------------------------------------
Ran 7 tests in 0.125s

FAILED (failures=1, errors=1)
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = unittestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({
        language: 'python',
        framework: 'unittest'
      });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.failingTests).toContain('test_creation (test_models.TestUser)');
      expect(result.failingTests).toContain('test_validation (test_models.TestUser)');
      expect(result.totalFailures).toBe(2);
    });
  });

  describe('Auto-Detection', () => {
    it('should auto-detect JavaScript project with package.json', () => {
      const projectPath = '/test/project';
      
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'package.json')) return true;
        return false;
      });
      
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'package.json')) {
          return JSON.stringify({
            devDependencies: {
              'jest': '^27.0.0'
            }
          });
        }
        return '';
      });

      const language = TestRunner.detectLanguage(projectPath);
      const framework = TestRunner.detectFramework('javascript', projectPath);
      
      expect(language).toBe('javascript');
      expect(framework).toBe('jest');
    });

    it('should auto-detect Ruby project with Gemfile', () => {
      const projectPath = '/test/project';
      
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'Gemfile')) return true;
        return false;
      });
      
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'Gemfile')) {
          return `
source 'https://rubygems.org'
gem 'rails', '~> 7.0'
gem 'rspec-rails', group: [:development, :test]
          `;
        }
        return '';
      });

      const language = TestRunner.detectLanguage(projectPath);
      const framework = TestRunner.detectFramework('ruby', projectPath);
      
      expect(language).toBe('ruby');
      expect(framework).toBe('rspec');
    });

    it('should auto-detect Python project with requirements.txt', () => {
      const projectPath = '/test/project';
      
      mockFs.existsSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'requirements.txt')) return true;
        return false;
      });
      
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath === path.join(projectPath, 'requirements.txt')) {
          return `
django==4.0.0
pytest==7.1.0
pytest-django==4.5.0
          `;
        }
        return '';
      });

      const language = TestRunner.detectLanguage(projectPath);
      const framework = TestRunner.detectFramework('python', projectPath);
      
      expect(language).toBe('python');
      expect(framework).toBe('pytest');
    });

    it('should handle auto-detection with TestRunner constructor', () => {
      jest.spyOn(adapterRegistry, 'detectLanguage').mockReturnValue('ruby');
      const adapter = adapterRegistry.get('ruby');
      jest.spyOn(adapter, 'detectFramework').mockReturnValue('minitest');

      mockExecSync.mockReturnValue('All tests passed\n');

      const runner = new TestRunner({ autoDetect: true });
      const result = runner.run();

      expect(result.language).toBe('ruby');
      expect(result.framework).toBe('minitest');
      expect(result.success).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should default to JavaScript/Jest when no options provided', () => {
      mockExecSync.mockReturnValue('All tests passed\n');

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.language).toBe('javascript');
      expect(result.framework).toBe('jest');
      expect(result.command).toBe('npm test');
    });

    it('should support legacy framework-only option', () => {
      mockExecSync.mockReturnValue('All tests passed\n');

      const runner = new TestRunner({ framework: 'mocha' });
      const result = runner.run();

      expect(result.language).toBe('javascript');
      expect(result.framework).toBe('mocha');
    });

    it('should handle old-style Jest output', () => {
      const jestOutput = `
        PASS src/tests/passing.test.ts
        FAIL src/tests/failing.test.ts
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = jestOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.failingTests).toContain('src/tests/failing.test.ts');
    });
  });

  describe('Cross-Language Features', () => {
    it('should support custom commands for any language', () => {
      mockExecSync.mockReturnValue('Custom test output\n');

      const runner = new TestRunner({
        language: 'python',
        framework: 'pytest',
        command: 'poetry run pytest -v'
      });
      const result = runner.run();

      expect(result.command).toBe('poetry run pytest -v');
      expect(mockExecSync).toHaveBeenCalledWith(
        'poetry run pytest -v',
        expect.any(Object)
      );
    });

    it('should normalize file paths across languages', () => {
      const outputs = {
        javascript: 'FAIL src/tests/auth.test.ts',
        ruby: 'Failure: test/models/user_test.rb:45',
        python: 'FAILED tests/test_auth.py::test_validation'
      };

      Object.entries(outputs).forEach(([language, output]) => {
        mockExecSync.mockImplementation(() => {
          const error: any = new Error('Tests failed');
          error.status = 1;
          error.stdout = output;
          error.stderr = '';
          throw error;
        });

        const runner = new TestRunner({
          language: language as any,
          framework: language === 'javascript' ? 'jest' : 
                      language === 'ruby' ? 'minitest' : 'pytest'
        });
        const result = runner.run();

        expect(result.failingTests).toHaveLength(1);
        expect(result.failingTests[0]).toBeTruthy();
      });
    });

    it('should handle mixed language output gracefully', () => {
      const mixedOutput = `
        Running tests...
        Some generic output
        ERROR: Something went wrong
        Tests completed with failures
      `;

      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = mixedOutput;
        error.stderr = '';
        throw error;
      });

      const runner = new TestRunner({
        language: 'python',
        framework: 'pytest'
      });
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('ERROR');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing language adapter gracefully', () => {
      const getSpy = jest.spyOn(adapterRegistry, 'get').mockImplementation(() => {
        throw new Error('Adapter not found');
      });

      expect(() => new TestRunner({ language: 'unsupported' as any }))
        .toThrow('Adapter not found');
      
      getSpy.mockRestore();
    });

    it('should handle test execution errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found: npm');
      });

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command not found: npm');
    });

    it('should handle malformed test output', () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Tests failed');
        error.status = 1;
        error.stdout = null;
        error.stderr = null;
        throw error;
      });

      const runner = new TestRunner();
      const result = runner.run();

      expect(result.success).toBe(false);
      expect(result.failingTests).toEqual([]);
    });
  });
});