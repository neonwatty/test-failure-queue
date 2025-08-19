import { PythonAdapter } from '../../src/adapters/python-adapter';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('PythonAdapter', () => {
  let adapter: PythonAdapter;
  const mockFs = fs as jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    adapter = new PythonAdapter();
    jest.clearAllMocks();
  });
  
  describe('language and frameworks', () => {
    it('should have language set to python', () => {
      expect(adapter.language).toBe('python');
    });
    
    it('should support multiple frameworks', () => {
      expect(adapter.supportedFrameworks).toEqual(['pytest', 'unittest', 'django', 'nose2']);
    });
  });
  
  describe('detectFramework', () => {
    it('should detect pytest from requirements.txt', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('pytest==7.4.0\nrequests==2.31.0');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('pytest');
    });
    
    it('should detect django from manage.py', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('manage.py');
      });
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('django');
    });
    
    it('should detect django from requirements', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('django==4.2.0\npsycopg2==2.9.0');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('django');
    });
    
    it('should detect pytest from pyproject.toml', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('pyproject.toml');
      });
      mockFs.readFileSync.mockReturnValue('[tool.pytest.ini_options]');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('pytest');
    });
    
    it('should detect nose2 from requirements', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('requirements.txt');
      });
      mockFs.readFileSync.mockReturnValue('nose2==0.13.0');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('nose2');
    });
    
    it('should detect pytest from test directory structure', async () => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.endsWith('/tests');
      });
      mockFs.readdirSync.mockReturnValue(['test_user.py', 'test_auth.py'] as any);
      mockFs.readFileSync.mockReturnValue('');
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('pytest');
    });
    
    it('should default to unittest', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const result = await adapter.detectFramework('/test/path');
      expect(result).toBe('unittest');
    });
  });
  
  describe('getTestCommand', () => {
    it('should return pytest for pytest framework', () => {
      expect(adapter.getTestCommand('pytest')).toBe('pytest');
    });
    
    it('should return pytest with path', () => {
      expect(adapter.getTestCommand('pytest', 'tests/test_user.py')).toBe('pytest tests/test_user.py');
    });
    
    it('should return python -m unittest discover for unittest', () => {
      expect(adapter.getTestCommand('unittest')).toBe('python -m unittest discover');
    });
    
    it('should return python manage.py test for django', () => {
      expect(adapter.getTestCommand('django')).toBe('python manage.py test');
    });
    
    it('should return nose2 for nose2 framework', () => {
      expect(adapter.getTestCommand('nose2')).toBe('nose2');
    });
    
    it('should handle unknown framework', () => {
      expect(adapter.getTestCommand('unknown')).toBe('python -m pytest');
    });
  });
  
  describe('parseTestOutput - Pytest', () => {
    it('should parse pytest failure output', () => {
      const output = `
        ============================= test session starts ==============================
        
        FAILED tests/test_user.py::test_validation - AssertionError
        FAILED tests/test_auth.py::test_login[param1] - ValueError
        
        =================== 2 failed, 10 passed, 1 skipped in 2.34s ===================
      `;
      
      const result = adapter.parseTestOutput(output, 'pytest');
      expect(result.passed).toBe(false);
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0].file).toBe('tests/test_user.py');
      // Summary based on extracted pattern
      expect(result.summary.total).toBe(12);  // From "2 failed, 10 passed, 1 skipped"
      expect(result.summary.passed).toBe(10);
      expect(result.summary.failed).toBe(2);
      expect(result.summary.skipped).toBe(1);
    });
    
    it('should parse pytest error output', () => {
      const output = `
        ERROR tests/test_setup.py::test_fixture - ImportError
        
        =================== 1 error, 5 passed in 1.23s ===================
      `;
      
      const result = adapter.parseTestOutput(output, 'pytest');
      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('tests/test_setup.py');
    });
  });
  
  describe('parseTestOutput - Unittest', () => {
    it('should parse unittest failure output', () => {
      const output = `
        F.E...
        ======================================================================
        FAIL: test_validation (test_user.TestUser)
        ----------------------------------------------------------------------
        Traceback (most recent call last):
          File "tests/test_user.py", line 45, in test_validation
            self.assertTrue(user.is_valid())
        AssertionError: False is not true
        
        ======================================================================
        ERROR: test_creation (test_user.TestUser)
        ----------------------------------------------------------------------
        
        Ran 6 tests in 0.234s
        
        FAILED (failures=1, errors=1)
      `;
      
      const result = adapter.parseTestOutput(output, 'unittest');
      expect(result.passed).toBe(false);
      expect(result.summary).toEqual({
        total: 6,
        passed: 4,
        failed: 2,
        skipped: 0
      });
    });
    
    it('should parse unittest success output', () => {
      const output = `
        ......
        ----------------------------------------------------------------------
        Ran 6 tests in 0.123s
        
        OK
      `;
      
      const result = adapter.parseTestOutput(output, 'unittest');
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.total).toBe(6);
      expect(result.summary.passed).toBe(6);
    });
  });
  
  describe('parseTestOutput - Django', () => {
    it('should parse django test output', () => {
      const output = `
        Creating test database...
        System check identified no issues (0 silenced).
        F.E...
        ======================================================================
        FAIL: test_user_creation (users.tests.TestUser)
        ----------------------------------------------------------------------
        
        Ran 6 tests in 0.543s
        
        FAILED (failures=1, errors=1)
        Destroying test database...
      `;
      
      const result = adapter.parseTestOutput(output, 'django');
      expect(result.passed).toBe(false);
      expect(result.summary.total).toBe(6);
      expect(result.summary.failed).toBe(2);
      expect(result.summary.passed).toBe(4);
    });
  });
  
  describe('validateFramework', () => {
    it('should validate supported frameworks', () => {
      expect(adapter.validateFramework('pytest')).toBe(true);
      expect(adapter.validateFramework('unittest')).toBe(true);
      expect(adapter.validateFramework('django')).toBe(true);
      expect(adapter.validateFramework('nose2')).toBe(true);
    });
    
    it('should reject unsupported frameworks', () => {
      expect(adapter.validateFramework('unknown')).toBe(false);
    });
    
    it('should be case-insensitive', () => {
      expect(adapter.validateFramework('PyTest')).toBe(true);
      expect(adapter.validateFramework('DJANGO')).toBe(true);
    });
  });
});