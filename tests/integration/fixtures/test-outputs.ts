export const testOutputs = {
  javascript: {
    jest: {
      passing: `
PASS  src/components/Button.test.tsx
PASS  src/utils/validation.test.ts
PASS  src/hooks/useAuth.test.ts

Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
Snapshots:   2 passed, 2 total
Time:        2.341 s
Ran all test suites.`,
      failing: `
PASS  src/components/Button.test.tsx
FAIL  src/utils/validation.test.ts
  ● Validation › should validate email format

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      12 |   it('should validate email format', () => {
      13 |     const result = validateEmail('invalid');
    > 14 |     expect(result).toBe(true);
         |                    ^
      15 |   });

      at Object.<anonymous> (src/utils/validation.test.ts:14:20)

FAIL  src/hooks/useAuth.test.ts
  ● useAuth › should handle login

    TypeError: Cannot read property 'user' of undefined

      23 |   it('should handle login', async () => {
      24 |     const { result } = renderHook(() => useAuth());
    > 25 |     await result.current.login('user@example.com', 'password');
         |                          ^
      26 |     expect(result.current.user).toBeDefined();

      at src/hooks/useAuth.test.ts:25:26

Test Suites: 2 failed, 1 passed, 3 total
Tests:       2 failed, 13 passed, 15 total
Snapshots:   2 passed, 2 total
Time:        2.567 s
Ran all test suites.`
    },
    mocha: {
      passing: `
  Authentication
    ✓ should login with valid credentials (45ms)
    ✓ should reject invalid credentials (12ms)
    ✓ should logout successfully

  API Client
    ✓ should fetch user data
    ✓ should handle network errors (120ms)

  5 passing (201ms)`,
      failing: `
  Authentication
    ✓ should login with valid credentials (45ms)
    1) should reject invalid credentials
    ✓ should logout successfully

  API Client
    2) should fetch user data
    ✓ should handle network errors (120ms)

  3 passing (234ms)
  2 failing

  1) Authentication
       should reject invalid credentials:
     AssertionError: expected 200 to equal 401
      at Context.<anonymous> (test/auth.test.js:15:30)

  2) API Client
       should fetch user data:
     Error: Connection timeout
      at Context.<anonymous> (test/api.test.js:23:15)`
    },
    vitest: {
      passing: `
✓ src/components/Button.test.tsx (5)
✓ src/utils/format.test.ts (8)
✓ src/services/api.test.ts (12)

Test Files  3 passed (3)
     Tests  25 passed (25)
  Start at  14:23:15
  Duration  1.23s`,
      failing: `
✓ src/components/Button.test.tsx (5)
❯ src/utils/format.test.ts (6/8)
  × should format currency
  × should format date
✓ src/services/api.test.ts (12)

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

FAIL  src/utils/format.test.ts > should format currency
AssertionError: expected '$100' to be '$100.00'
 ❯ src/utils/format.test.ts:8:23

FAIL  src/utils/format.test.ts > should format date
TypeError: Cannot read properties of null
 ❯ src/utils/format.test.ts:15:18

Test Files  1 failed | 2 passed (3)
     Tests  2 failed | 23 passed (25)
  Start at  14:25:32
  Duration  1.45s`
    },
    jasmine: {
      passing: `
Started
.......

7 specs, 0 failures
Finished in 0.125 seconds`,
      failing: `
Started
F.F....

Failures:
1) UserService should create user
  Message:
    Expected undefined to be defined.
  Stack:
    Error: Expected undefined to be defined.
        at <Jasmine>
        at UserContext.<anonymous> (spec/user.spec.js:15:25)

2) AuthService should validate token
  Message:
    Expected false to be truthy.
  Stack:
    Error: Expected false to be truthy.
        at <Jasmine>
        at UserContext.<anonymous> (spec/auth.spec.js:28:31)

7 specs, 2 failures
Finished in 0.156 seconds`
    },
    ava: {
      passing: `
  ✔ auth › login with valid credentials (45ms)
  ✔ auth › reject invalid credentials (12ms)
  ✔ user › create new user
  ✔ user › update user profile

  4 tests passed`,
      failing: `
  ✔ auth › login with valid credentials (45ms)
  ✖ auth › reject invalid credentials Rejected promise returned by test
  ✔ user › create new user
  ✖ user › update user profile Expected value to be deeply equal to:

  auth › reject invalid credentials

  Rejected promise returned by test. Reason:

  Error {
    message: 'Expected status 401 but got 200',
  }

  › test/auth.test.js:15:3

  user › update user profile

  Difference:

  {
    name: 'John Doe',
  - email: 'john@example.com',
  + email: undefined,
  }

  › test/user.test.js:28:5

  2 tests failed`
    }
  },
  ruby: {
    minitest: {
      passing: `
Run options: --seed 42

# Running:

........

Finished in 0.234567s, 34.1234 runs/s, 42.5678 assertions/s.
8 runs, 10 assertions, 0 failures, 0 errors, 0 skips`,
      failing: `
Run options: --seed 12345

# Running:

..F.E...

Finished in 0.345678s, 23.1234 runs/s, 28.9012 assertions/s.

  1) Failure:
UserTest#test_email_validation [test/models/user_test.rb:45]:
Expected false to be truthy.

  2) Error:
UserTest#test_save_without_email:
NoMethodError: undefined method 'save!' for nil:NilClass
    test/models/user_test.rb:52:in 'block in <class:UserTest>'

8 runs, 10 assertions, 1 failures, 1 errors, 0 skips`
    }
  },
  python: {
    pytest: {
      passing: `
============================= test session starts ==============================
platform darwin -- Python 3.9.7, pytest-7.1.2, pluggy-1.0.0
rootdir: /Users/test/project
collected 10 items

tests/test_auth.py ....                                                   [ 40%]
tests/test_models.py ....                                                 [ 80%]
tests/test_utils.py ..                                                    [100%]

============================== 10 passed in 0.45s ===============================`,
      failing: `
============================= test session starts ==============================
platform darwin -- Python 3.9.7, pytest-7.1.2, pluggy-1.0.0
rootdir: /Users/test/project
collected 10 items

tests/test_auth.py ..F.                                                   [ 40%]
tests/test_models.py .F..                                                 [ 80%]
tests/test_utils.py ..                                                    [100%]

=================================== FAILURES ===================================
_______________________________ test_login_invalid _____________________________

    def test_login_invalid():
        response = client.post('/login', json={'email': 'test@test.com', 'password': 'wrong'})
>       assert response.status_code == 401
E       assert 200 == 401
E        +  where 200 = <Response [200]>.status_code

tests/test_auth.py:15: AssertionError
________________________________ test_user_save ________________________________

    def test_user_save():
        user = User(email='test@example.com')
>       user.save()
E       AttributeError: 'NoneType' object has no attribute 'save'

tests/test_models.py:23: AttributeError
=========================== short test summary info ============================
FAILED tests/test_auth.py::test_login_invalid - assert 200 == 401
FAILED tests/test_models.py::test_user_save - AttributeError: 'NoneType' object has no attribute 'save'
========================= 2 failed, 8 passed in 0.67s ==========================`
    },
    unittest: {
      passing: `
..........
----------------------------------------------------------------------
Ran 10 tests in 0.234s

OK`,
      failing: `
..F.E.....
======================================================================
ERROR: test_user_creation (test_models.TestUser)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_models.py", line 23, in test_user_creation
    user.save()
AttributeError: 'NoneType' object has no attribute 'save'

======================================================================
FAIL: test_email_validation (test_models.TestUser)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_models.py", line 15, in test_email_validation
    self.assertTrue(user.is_valid())
AssertionError: False is not true

----------------------------------------------------------------------
Ran 10 tests in 0.345s

FAILED (failures=1, errors=1)`
    }
  }
};

export function getTestOutput(
  language: string,
  framework: string,
  failing: boolean = false
): string {
  const langOutputs = testOutputs[language as keyof typeof testOutputs];
  if (!langOutputs) {
    throw new Error(`No test outputs for language: ${language}`);
  }
  
  const frameworkOutputs = langOutputs[framework as keyof typeof langOutputs] as any;
  if (!frameworkOutputs) {
    throw new Error(`No test outputs for framework: ${framework} in ${language}`);
  }
  
  return failing ? frameworkOutputs.failing : frameworkOutputs.passing;
}

export const failingTestPaths = {
  javascript: {
    jest: ['src/utils/validation.test.ts', 'src/hooks/useAuth.test.ts'],
    mocha: ['test/auth.test.js', 'test/api.test.js'],
    vitest: ['src/utils/format.test.ts'],
    jasmine: ['spec/user.spec.js', 'spec/auth.spec.js'],
    ava: ['test/auth.test.js', 'test/user.test.js']
  },
  ruby: {
    minitest: ['test/models/user_test.rb']
  },
  python: {
    pytest: ['tests/test_auth.py', 'tests/test_models.py'],
    unittest: ['test_models.py']
  }
};

export function getExpectedFailures(language: string, framework: string): string[] {
  const langPaths = failingTestPaths[language as keyof typeof failingTestPaths];
  if (!langPaths) return [];
  
  const frameworkPaths = langPaths[framework as keyof typeof langPaths];
  return frameworkPaths || [];
}