/**
 * Config Manager
 * 
 * Manages CommitGPT configuration with support for:
 * - Global config (~/.commmitgptrc)
 * - Project config (.commmitgptrc in repo)
 * - Environment variables
 * - CLI flags (highest priority)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CommitGPTConfig {
  openAIKey?: string;
  anthropicKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  conventionalCommits: boolean;
  autoAttachIssues: boolean;
  issuePatterns: string[];
  language: string;
  maxSubjectLength: number;
  includeEmoji: boolean;
  gitHookMode: 'commit-msg' | 'prepare-commit-msg' | 'none';
  suggestSquash: boolean;
  detectBreaking: boolean;
  multiLanguage: boolean;
  supportedLanguages: string[];
  learningEnabled: boolean;
  learningDataPath: string;
  changelogPath: string;
  styleProfile?: any;
}

const DEFAULT_CONFIG: CommitGPTConfig = {
  conventionalCommits: true,
  autoAttachIssues: true,
  issuePatterns: [
    '(?:closes?|fixes?|resolves?)\\s+#?(\\d+)',
    '#(\\d+)',
    '([A-Z]+-\\d+)',
  ],
  language: 'en',
  maxSubjectLength: 72,
  includeEmoji: false,
  gitHookMode: 'none',
  suggestSquash: true,
  detectBreaking: true,
  multiLanguage: true,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'ko', 'ru'],
  learningEnabled: true,
  learningDataPath: '.commmitgpt',
  changelogPath: 'CHANGELOG.md',
};

export class ConfigManager {
  private globalConfigPath: string;
  private projectConfigPath: string | null = null;
  private config: CommitGPTConfig;
  private envPrefix = 'COMMITGPT_';

  constructor(initialConfig?: Partial<CommitGPTConfig>) {
    // Set up config paths
    this.globalConfigPath = path.join(os.homedir(), '.commmitgptrc');
    
    // Try to find project config
    const cwd = process.cwd();
    const possiblePaths = [
      path.join(cwd, '.commmitgptrc'),
      path.join(cwd, '.commmitgptrc.json'),
      path.join(cwd, '.commmitgptrc.js'),
      path.join(cwd, 'commmitgpt.config.js'),
    ];
    
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.projectConfigPath = p;
        break;
      }
    }

    // Initialize with defaults
    this.config = { ...DEFAULT_CONFIG };

    // Apply initial config if provided
    if (initialConfig) {
      this.config = { ...this.config, ...initialConfig };
    }
  }

  /**
   * Load configuration from all sources
   */
  async load(): Promise<CommitGPTConfig> {
    // Load global config
    await this.loadGlobalConfig();

    // Load project config (overrides global)
    await this.loadProjectConfig();

    // Load from environment variables (overrides all)
    this.loadFromEnv();

    return this.config;
  }

  /**
   * Load global config file
   */
  private async loadGlobalConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.globalConfigPath)) {
        const content = fs.readFileSync(this.globalConfigPath, 'utf-8');
        const globalConfig = this.parseConfig(content);
        this.config = { ...this.config, ...globalConfig };
      }
    } catch (error) {
      // Ignore errors loading global config
    }
  }

  /**
   * Load project config file
   */
  private async loadProjectConfig(): Promise<void> {
    if (!this.projectConfigPath) return;

    try {
      const content = fs.readFileSync(this.projectConfigPath, 'utf-8');
      const projectConfig = this.parseConfig(content);
      this.config = { ...this.config, ...projectConfig };
    } catch (error) {
      // Ignore errors loading project config
    }
  }

  /**
   * Load configuration from environment variables
   */
  private loadFromEnv(): void {
    const envConfig: Partial<CommitGPTConfig> = {};

    // String values
    if (process.env[this.envPrefix + 'OPENAI_KEY']) {
      envConfig.openAIKey = process.env[this.envPrefix + 'OPENAI_KEY'];
    }
    if (process.env[this.envPrefix + 'ANTHROPIC_KEY']) {
      envConfig.anthropicKey = process.env[this.envPrefix + 'ANTHROPIC_KEY'];
    }
    if (process.env[this.envPrefix + 'MODEL']) {
      envConfig.model = process.env[this.envPrefix + 'MODEL'];
    }
    if (process.env[this.envPrefix + 'LANGUAGE']) {
      envConfig.language = process.env[this.envPrefix + 'LANGUAGE'];
    }

    // Boolean values
    if (process.env[this.envPrefix + 'CONVENTIONAL_COMMITS']) {
      envConfig.conventionalCommits = 
        process.env[this.envPrefix + 'CONVENTIONAL_COMMITS']!.toLowerCase() === 'true';
    }
    if (process.env[this.envPrefix + 'AUTO_ATTACH_ISSUES']) {
      envConfig.autoAttachIssues = 
        process.env[this.envPrefix + 'AUTO_ATTACH_ISSUES']!.toLowerCase() === 'true';
    }
    if (process.env[this.envPrefix + 'INCLUDE_EMOJI']) {
      envConfig.includeEmoji = 
        process.env[this.envPrefix + 'INCLUDE_EMOJI']!.toLowerCase() === 'true';
    }
    if (process.env[this.envPrefix + 'LEARNING_ENABLED']) {
      envConfig.learningEnabled = 
        process.env[this.envPrefix + 'LEARNING_ENABLED']!.toLowerCase() === 'true';
    }

    // Number values
    if (process.env[this.envPrefix + 'MAX_TOKENS']) {
      envConfig.maxTokens = parseInt(process.env[this.envPrefix + 'MAX_TOKENS']!, 10);
    }
    if (process.env[this.envPrefix + 'TEMPERATURE']) {
      envConfig.temperature = parseFloat(process.env[this.envPrefix + 'TEMPERATURE']!);
    }
    if (process.env[this.envPrefix + 'MAX_SUBJECT_LENGTH']) {
      envConfig.maxSubjectLength = parseInt(process.env[this.envPrefix + 'MAX_SUBJECT_LENGTH']!, 10);
    }

    this.config = { ...this.config, ...envConfig };
  }

  /**
   * Parse config file content
   */
  private parseConfig(content: string): Partial<CommitGPTConfig> {
    const ext = path.extname(this.projectConfigPath || this.globalConfigPath).toLowerCase();
    
    try {
      if (ext === '.js') {
        // JavaScript config file
        const fn = new Function('module', 'exports', 'require', content);
        const module: any = { exports: {} };
        fn(module, module.exports, require);
        return module.exports.default || module.exports;
      } else {
        // JSON config file
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error parsing config:', error);
      return {};
    }
  }

  /**
   * Get a config value
   */
  get<K extends keyof CommitGPTConfig>(
    key: K,
    defaultValue?: CommitGPTConfig[K]
  ): CommitGPTConfig[K] {
    return this.config[key] ?? defaultValue ?? DEFAULT_CONFIG[key];
  }

  /**
   * Get all config
   */
  getAll(): CommitGPTConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async update(config: Partial<CommitGPTConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Optionally save to project config
    if (this.projectConfigPath) {
      await this.saveProjectConfig();
    }
  }

  /**
   * Save config to project file
   */
  private async saveProjectConfig(): Promise<void> {
    if (!this.projectConfigPath) return;

    try {
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.projectConfigPath, content, 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Save global config
   */
  async saveGlobalConfig(): Promise<void> {
    try {
      const content = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.globalConfigPath, content, 'utf-8');
    } catch (error) {
      console.error('Error saving global config:', error);
    }
  }

  /**
   * Create default config files
   */
  async initGlobal(): Promise<void> {
    // Create global config directory
    const dir = path.dirname(this.globalConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save default config
    await this.saveGlobalConfig();
    
    console.log(`Global config created at: ${this.globalConfigPath}`);
  }

  /**
   * Create project config file
   */
  async initProject(projectPath?: string): Promise<void> {
    const targetPath = projectPath || path.join(process.cwd(), '.commmitgptrc');
    
    try {
      const content = JSON.stringify({
        ...this.config,
        openAIKey: undefined, // Don't save API keys
        anthropicKey: undefined,
      }, null, 2);
      
      fs.writeFileSync(targetPath, content, 'utf-8');
      console.log(`Project config created at: ${targetPath}`);
    } catch (error) {
      console.error('Error creating project config:', error);
    }
  }

  /**
   * Check if config exists
   */
  hasConfig(): boolean {
    return fs.existsSync(this.globalConfigPath) || 
           (this.projectConfigPath !== null && fs.existsSync(this.projectConfigPath));
  }

  /**
   * Get config sources
   */
  getConfigSources(): { name: string; path: string }[] {
    const sources: { name: string; path: string }[] = [];

    if (fs.existsSync(this.globalConfigPath)) {
      sources.push({ name: 'Global', path: this.globalConfigPath });
    }

    if (this.projectConfigPath && fs.existsSync(this.projectConfigPath)) {
      sources.push({ name: 'Project', path: this.projectConfigPath });
    }

    return sources;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check API keys if needed
    // (Currently no AI features require keys, but structure for future)

    // Validate language
    if (!DEFAULT_CONFIG.supportedLanguages.includes(this.config.language)) {
      errors.push(`Unsupported language: ${this.config.language}`);
    }

    // Validate max subject length
    if (this.config.maxSubjectLength < 10 || this.config.maxSubjectLength > 200) {
      errors.push('maxSubjectLength must be between 10 and 200');
    }

    // Validate temperature
    if (this.config.temperature !== undefined) {
      if (this.config.temperature < 0 || this.config.temperature > 2) {
        errors.push('temperature must be between 0 and 2');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ConfigManager;
