import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigFile } from './types';

export class ConfigManager {
  private config: ConfigFile = {};
  private configPath: string | null = null;

  constructor(customConfigPath?: string) {
    this.loadConfig(customConfigPath);
  }

  private loadConfig(customConfigPath?: string): void {
    const configPaths = this.getConfigPaths(customConfigPath);
    
    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          const parsed = JSON.parse(content);
          this.config = this.mergeConfig(this.config, parsed);
          this.configPath = configPath;
          break;
        } catch (error) {
          console.warn(`Warning: Failed to parse config file at ${configPath}:`, error);
        }
      }
    }
  }

  private getConfigPaths(customPath?: string): string[] {
    const paths: string[] = [];
    
    if (customPath) {
      paths.push(path.resolve(customPath));
    }
    
    paths.push(
      path.join(process.cwd(), '.tfqrc'),
      path.join(os.homedir(), '.tfqrc'),
      path.join(os.homedir(), '.tfq', 'config.json')
    );
    
    return paths;
  }

  private mergeConfig(base: ConfigFile, override: ConfigFile): ConfigFile {
    return { ...base, ...override };
  }

  private expandPath(filePath: string): string {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    return filePath;
  }

  getConfig(): ConfigFile {
    const config = { ...this.config };
    
    if (config.databasePath) {
      config.databasePath = this.expandPath(config.databasePath);
    }
    
    return config;
  }

  getConfigPath(): string | null {
    return this.configPath;
  }

  createDefaultConfig(targetPath?: string): void {
    const defaultConfig: ConfigFile = {
      databasePath: '~/.tfq/queue.db',
      defaultPriority: 0,
      autoCleanup: false,
      maxRetries: 3,
      verbose: false,
      jsonOutput: false,
      colorOutput: true
    };

    const configPath = targetPath || path.join(process.cwd(), '.tfqrc');
    
    fs.writeFileSync(
      configPath, 
      JSON.stringify(defaultConfig, null, 2),
      'utf-8'
    );
  }

  static getInstance(customConfigPath?: string): ConfigManager {
    return new ConfigManager(customConfigPath);
  }
}

export function loadConfig(customConfigPath?: string): ConfigFile {
  const manager = new ConfigManager(customConfigPath);
  return manager.getConfig();
}