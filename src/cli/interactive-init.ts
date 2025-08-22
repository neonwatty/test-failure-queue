import chalk from 'chalk';
import { TfqConfig } from '../core/types.js';
import { InitService, InitOptions } from '../core/init-service.js';
import readline from 'readline';

export async function interactiveInit(
  service: InitService,
  options: InitOptions
): Promise<TfqConfig> {
  console.log(chalk.bold('🚀 TFQ Interactive Setup\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string, defaultValue?: string): Promise<string> => {
    const fullPrompt = defaultValue 
      ? `${prompt} ${chalk.gray(`(${defaultValue})`)}: `
      : `${prompt}: `;
    
    return new Promise((resolve) => {
      rl.question(fullPrompt, (answer) => {
        resolve(answer.trim() || defaultValue || '');
      });
    });
  };

  const confirm = async (prompt: string, defaultYes: boolean = true): Promise<boolean> => {
    const hint = defaultYes ? '(Y/n)' : '(y/N)';
    const answer = await question(`${prompt} ${chalk.gray(hint)}`, defaultYes ? 'y' : 'n');
    return answer.toLowerCase() === 'y' || (defaultYes && answer === '');
  };

  try {
    // Detect project information
    const projectPath = options.scope || process.cwd();
    console.log(`Analyzing project at: ${chalk.cyan(projectPath)}\n`);

    const detectedLanguage = service.detectProjectType(projectPath);
    const detectedFramework = detectedLanguage 
      ? service.detectFramework(detectedLanguage, projectPath) 
      : null;

    if (detectedLanguage) {
      console.log(chalk.green('✓'), 'Detected language:', chalk.yellow(detectedLanguage));
    }
    if (detectedFramework) {
      console.log(chalk.green('✓'), 'Detected framework:', chalk.yellow(detectedFramework));
    }
    console.log();

    // Database path
    const defaultDbPath = options.ci ? '/tmp/tfq-queue.db' : './.tfq/queue.db';
    const dbPath = await question(
      'Where should the test queue database be stored?',
      options.dbPath || defaultDbPath
    );

    // Auto-detect confirmation
    const useAutoDetect = await confirm(
      'Auto-detect language and framework for test execution?',
      true
    );

    let language = detectedLanguage;
    let framework = detectedFramework;

    if (!useAutoDetect) {
      // Manual language selection
      const languageInput = await question(
        'Enter language (javascript/python/ruby/go/java)',
        detectedLanguage || 'javascript'
      );
      language = languageInput as any;

      // Manual framework selection
      if (language) {
        const frameworkInput = await question(
          `Enter framework for ${language}`,
          detectedFramework || ''
        );
        framework = frameworkInput || null;
      }
    }

    // Parallel test processes
    const parallelStr = await question(
      'Default number of parallel test processes?',
      '4'
    );
    const parallel = parseInt(parallelStr, 10) || 4;

    // Auto-add failed tests
    const autoAdd = await confirm(
      'Automatically add failed tests after test runs?',
      true
    );

    // Workspace configuration for monorepos
    let workspaces: Record<string, string> | undefined;
    if (!options.ci && await confirm('Is this a monorepo with workspaces?', false)) {
      console.log('\n' + chalk.yellow('Workspace configuration:'));
      console.log(chalk.gray('Enter workspace paths (e.g., packages/app) one per line.'));
      console.log(chalk.gray('Press Enter with empty line when done.\n'));

      workspaces = {};
      let workspacePath = await question('Workspace path');
      while (workspacePath) {
        const wsName = workspacePath.split('/').pop() || workspacePath;
        workspaces[workspacePath] = `./.tfq/${wsName}-queue.db`;
        console.log(chalk.gray(`  Added: ${workspacePath} → ./.tfq/${wsName}-queue.db`));
        workspacePath = await question('Workspace path');
      }
    }

    // Build configuration
    const config: TfqConfig = {
      database: { path: dbPath },
      defaults: { autoAdd, parallel }
    };

    if (language) {
      config.language = language;
    }

    if (framework) {
      config.framework = framework;
    }

    if (workspaces && Object.keys(workspaces).length > 0) {
      config.workspaces = workspaces;
      config.workspaceDefaults = { autoAdd, parallel };
    }

    // Preview configuration
    console.log('\n' + chalk.bold('Configuration Preview:'));
    console.log(JSON.stringify(config, null, 2));
    console.log();

    const proceed = await confirm('Save this configuration?', true);
    if (!proceed) {
      throw new Error('Configuration cancelled by user');
    }

    rl.close();

    // Initialize with the configured options
    const initOptions: InitOptions = {
      ...options,
      dbPath: config.database?.path,
      workspaceMode: !!config.workspaces
    };

    // Create database directory and handle gitignore
    await service.initialize(initOptions);

    return config;
  } catch (error) {
    rl.close();
    throw error;
  }
}