/**
 * CommitGPT - Main Entry Point
 * 
 * AI-powered commit message generator with semantic analysis,
 * conventional commits, team style learning, and changelog generation.
 */

import { SemanticAnalyzer } from '../analyzers/semantic-analyzer';
import { ConventionalCommitFormatter } from '../analyzers/conventional-commit-formatter';
import { BreakingChangeDetector } from '../analyzers/breaking-change-detector';
import { IssueLinker } from '../analyzers/issue-linker';
import { MultiLanguageSupport } from '../analyzers/multi-language-support';
import { CommitHistoryAnalyzer } from '../analyzers/commit-history-analyzer';
import { TeamStyleLearner } from '../learners/team-style-learner';
import { InteractiveCommitCrafter } from '../generators/interactive-commit-crafter';
import { AutoSquashSuggester } from '../generators/auto-squash-suggester';
import { ChangelogGenerator } from '../generators/changelog-generator';
import { DiffParser } from '../utils/diff-parser';
import { GitManager } from '../utils/git-manager';
import { ConfigManager } from '../utils/config-manager';
import {
  CommitMessage,
  DiffResult,
  AnalysisResult,
  CommitStyle,
  ConventionalCommitMessage,
  CommitGPTConfig,
  Changelog,
  SquashGroup,
} from './types';

/**
 * Main CommitGPT class - orchestrates all analysis and generation components
 */
export class CommitGPT {
  private semanticAnalyzer: SemanticAnalyzer;
  private conventionalFormatter: ConventionalCommitFormatter;
  private breakingChangeDetector: BreakingChangeDetector;
  private issueLinker: IssueLinker;
  private multiLanguageSupport: MultiLanguageSupport;
  private historyAnalyzer: CommitHistoryAnalyzer;
  private styleLearner: TeamStyleLearner;
  private interactiveCrafter: InteractiveCommitCrafter;
  private squashSuggester: AutoSquashSuggester;
  private changelogGenerator: ChangelogGenerator;
  private diffParser: DiffParser;
  private gitManager: GitManager;
  private configManager: ConfigManager;
  private styleProfile: CommitStyle | null = null;

  constructor(config?: Partial<CommitGPTConfig>) {
    this.configManager = new ConfigManager(config);
    this.diffParser = new DiffParser();
    this.gitManager = new GitManager();
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.conventionalFormatter = new ConventionalCommitFormatter(
      this.configManager.get('maxSubjectLength', 72)
    );
    this.breakingChangeDetector = new BreakingChangeDetector();
    this.issueLinker = new IssueLinker(this.configManager.get('issuePatterns', []));
    this.multiLanguageSupport = new MultiLanguageSupport();
    this.historyAnalyzer = new CommitHistoryAnalyzer();
    this.styleLearner = new TeamStyleLearner();
    this.interactiveCrafter = new InteractiveCommitCrafter();
    this.squashSuggester = new AutoSquashSuggester();
    this.changelogGenerator = new ChangelogGenerator();
  }

  /**
   * Initialize CommitGPT - load config and learn from history
   */
  async initialize(): Promise<void> {
    await this.configManager.load();
    
    if (this.configManager.get('learningEnabled', true)) {
      await this.learnFromHistory();
    }
  }

  /**
   * Learn team commit style from git history
   */
  async learnFromHistory(maxCommits: number = 500): Promise<CommitStyle> {
    const commits = await this.historyAnalyzer.analyzeFromGit(
      this.gitManager,
      maxCommits
    );
    
    this.styleProfile = await this.styleLearner.learn(commits);
    return this.styleProfile;
  }

  /**
   * Analyze a diff and generate commit message
   */
  async analyzeAndGenerate(
    diffOutput: string,
    options?: {
      interactive?: boolean;
      conventionalCommits?: boolean;
      language?: string;
    }
  ): Promise<AnalysisResult> {
    // Parse the diff
    const diffResult = this.diffParser.parse(diffOutput);
    
    // Perform semantic analysis
    const semanticAnalysis = await this.semanticAnalyzer.analyze(diffResult);
    
    // Detect breaking changes
    const breakingChanges = await this.breakingChangeDetector.detect(diffResult);
    
    // Link issues if found
    const linkedIssues = this.issueLinker.findReferences(diffResult.rawDiff || '');
    
    // Determine language
    const language = options?.language || 
      this.multiLanguageSupport.detectLanguage(diffResult);
    
    // Generate conventional commit message
    const conventional = this.conventionalFormatter.format(
      semanticAnalysis,
      diffResult,
      {
        style: this.styleProfile,
        conventional: options?.conventionalCommits ?? 
          this.configManager.get('conventionalCommits', true),
        language,
      }
    );
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(
      semanticAnalysis,
      diffResult,
      breakingChanges
    );

    return {
      semantic: semanticAnalysis,
      diff: diffResult,
      conventional,
      suggestions,
      breakingChanges,
      linkedIssues,
      language,
      timestamp: new Date(),
    };
  }

  /**
   * Generate commit message from current staged changes
   */
  async generateFromStaged(
    options?: {
      interactive?: boolean;
      conventionalCommits?: boolean;
    }
  ): Promise<CommitMessage | null> {
    const stagedDiff = await this.gitManager.getStagedDiff();
    
    if (!stagedDiff) {
      console.log('No staged changes found.');
      return null;
    }

    const analysis = await this.analyzeAndGenerate(
      stagedDiff,
      options
    );

    return this.buildCommitMessage(analysis);
  }

  /**
   * Generate commit message from uncommitted changes (staged + unstaged)
   */
  async generateFromWorking(options?: {
    interactive?: boolean;
    conventionalCommits?: boolean;
  }): Promise<CommitMessage | null> {
    const workingDiff = await this.gitManager.getWorkingDiff();
    
    if (!workingDiff) {
      console.log('No changes found.');
      return null;
    }

    const analysis = await this.analyzeAndGenerate(
      workingDiff,
      options
    );

    return this.buildCommitMessage(analysis);
  }

  /**
   * Build complete commit message from analysis
   */
  private buildCommitMessage(analysis: AnalysisResult): CommitMessage {
    return {
      ...analysis.conventional,
      generated: true,
      confidence: this.calculateConfidence(analysis),
      suggestions: analysis.suggestions,
      language: analysis.language,
      diffSummary: `${analysis.diff.totalFiles} files, +${analysis.diff.totalAdditions} -${analysis.diff.totalDeletions}`,
      issueReferences: analysis.linkedIssues.map(i => i.id),
    };
  }

  /**
   * Calculate confidence score for generated message
   */
  private calculateConfidence(analysis: AnalysisResult): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for clear intent
    if (analysis.semantic.intent !== 'unknown') {
      confidence += 0.15;
    }
    
    // Boost for conventional format
    if (analysis.conventional.type) {
      confidence += 0.1;
    }
    
    // Boost for breaking changes detected properly
    if (analysis.breakingChanges.length > 0 && analysis.conventional.breaking) {
      confidence += 0.1;
    }
    
    // Boost for linked issues
    if (analysis.linkedIssues.length > 0) {
      confidence += 0.05;
    }
    
    // Boost for low complexity
    if (analysis.semantic.complexity === 'low') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Generate suggestions based on analysis
   */
  private generateSuggestions(
    semantic: any,
    diff: DiffResult,
    breaking: any[]
  ): any[] {
    const suggestions: any[] = [];

    // Suggest adding tests if missing
    const hasTestChanges = diff.files.some(f => f.isTest);
    const hasSourceChanges = diff.files.some(f => !f.isTest && !f.isConfig && !f.isDocs);
    
    if (hasSourceChanges && !hasTestChanges) {
      suggestions.push({
        type: 'add-tests',
        message: 'Consider adding or updating tests for your changes',
        priority: 'medium',
        autoApply: false,
      });
    }

    // Suggest updating docs if significant changes
    if (semantic.impact === 'major' && !diff.files.some(f => f.isDocs)) {
      suggestions.push({
        type: 'update-docs',
        message: 'Major changes detected - consider updating documentation',
        priority: 'medium',
        autoApply: false,
      });
    }

    // Warn about breaking changes
    if (breaking.length > 0 && !semantic.breakingSignals?.length) {
      suggestions.push({
        type: 'add-warning',
        message: `Detected ${breaking.length} potential breaking change(s). Add BREAKING CHANGE footer.`,
        priority: 'high',
        autoApply: false,
      });
    }

    // Suggest squash if too many file changes
    if (diff.totalFiles > 15) {
      suggestions.push({
        type: 'split-pr',
        message: 'Large number of files changed. Consider splitting into multiple commits.',
        priority: 'medium',
        autoApply: false,
      });
    }

    return suggestions;
  }

  /**
   * Start interactive commit crafting session
   */
  async interactiveCraft(
    diffOutput: string
  ): Promise<ConventionalCommitMessage | null> {
    const analysis = await this.analyzeAndGenerate(diffOutput);
    return this.interactiveCrafter.start(analysis);
  }

  /**
   * Suggest squash groups for commits
   */
  async suggestSquash(
    commitHashes?: string[]
  ): Promise<SquashGroup[]> {
    const commits = await this.gitManager.getCommits(commitHashes || []);
    return this.squashSuggester.suggest(commits);
  }

  /**
   * Generate changelog from git history
   */
  async generateChangelog(
    options?: {
      fromVersion?: string;
      toVersion?: string;
      includeUnreleased?: boolean;
      format?: 'markdown' | 'json' | 'keepachangelog';
    }
  ): Promise<Changelog> {
    const commits = await this.gitManager.getCommitsSince(
      options?.fromVersion || 'HEAD'
    );
    
    return this.changelogGenerator.generate(commits, options);
  }

  /**
   * Format commit message as string
   */
  formatMessage(message: ConventionalCommitMessage): string {
    return this.conventionalFormatter.toString(message);
  }

  /**
   * Get current style profile
   */
  getStyleProfile(): CommitStyle | null {
    return this.styleProfile;
  }

  /**
   * Update style profile
   */
  updateStyleProfile(style: Partial<CommitStyle>): void {
    if (this.styleProfile) {
      this.styleProfile = { ...this.styleProfile, ...style };
    }
  }

  /**
   * Get configuration
   */
  getConfig(): CommitGPTConfig {
    return this.configManager.getAll();
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<CommitGPTConfig>): Promise<void> {
    await this.configManager.update(config);
  }
}

export default CommitGPT;
