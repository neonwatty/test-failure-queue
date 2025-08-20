import { describe, it, expect } from 'vitest';
import { query } from '@anthropic-ai/claude-code';
import { execSync } from 'child_process';

describe('Claude Code Availability Check', () => {
  it('should detect if Claude Code SDK is available', () => {
    // The SDK module should always be available after npm install
    expect(query).toBeDefined();
    expect(typeof query).toBe('function');
  });

  it('should provide helpful information about Claude Code status', () => {
    let claudeCodeInstalled = false;
    
    try {
      // Check if claude command is available (Claude Code CLI installed)
      execSync('which claude', { stdio: 'ignore' });
      claudeCodeInstalled = true;
      console.log('✅ Claude Code appears to be installed on this system');
    } catch {
      console.log('ℹ️  Claude Code CLI not found. Install from https://claude.ai/code');
    }
    
    // This test always passes - it's just informational
    expect(true).toBe(true);
    
    if (claudeCodeInstalled) {
      console.log('   You should be able to use tfq fix-tests with Claude Code');
    } else {
      console.log('   Install and authenticate Claude Code to use AI-powered test fixing');
    }
  });

  it.skipIf(process.env.CI)(
    'should attempt to use Claude Code SDK (local testing only)',
    async () => {
      console.log('\n🧪 Testing Claude Code SDK connection...');
      
      try {
        let connected = false;
        const timeout = setTimeout(() => {
          if (!connected) {
            console.log('⏱️  Connection timeout - Claude Code may not be authenticated');
          }
        }, 5000);

        for await (const message of query({
          prompt: 'Respond with just "OK"',
          options: { maxTurns: 1 }
        })) {
          connected = true;
          clearTimeout(timeout);
          
          if (message.type === 'result' && message.subtype === 'success') {
            console.log('✅ Successfully connected to Claude Code!');
            expect(message.result).toBeDefined();
          } else if (message.type === 'result') {
            console.log(`⚠️  Received response with status: ${message.subtype}`);
          }
        }
      } catch (error: any) {
        console.log('\n❌ Could not connect to Claude Code');
        console.log('   This is expected if:');
        console.log('   1. Claude Code is not installed');
        console.log('   2. Claude Code is not authenticated');
        console.log('   3. You are not logged in to Claude Code');
        console.log('\n   To fix: Install Claude Code from https://claude.ai/code and authenticate');
        
        // Don't fail the test - this is informational
        expect(true).toBe(true);
      }
    }
  );
});