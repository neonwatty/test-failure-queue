import { execa } from 'execa';

console.log('Testing execa timeout behavior...');

try {
  const result = await execa('/Users/jeremywatt/.claude/local/claude', [
    '-p',
    '--dangerously-skip-permissions',
    '--verbose', 
    '--output-format',
    'text',
    'What is 2+2? Take your time and show detailed work.'
  ], {
    timeout: 5000, // 5 second timeout
    buffer: true
  });
  
  console.log('Success (should not happen):', result.stdout?.substring(0, 100));
} catch (error) {
  if (error.timedOut) {
    console.log('✅ Process timed out correctly');
    console.log('Duration:', error.durationMs, 'ms');
  } else {
    console.log('❌ Other error:', error.message);
  }
}

console.log('Test completed');
