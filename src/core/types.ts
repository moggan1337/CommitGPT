/**
 * Core type definitions for CommitGPT
 */

// Conventional commit types
export type ConventionalCommitType = 
  | 'feat' | 'fix' | 'docs' | 'style' | 'refactor' 
  | 'perf' | 'test' | 'build' | 'ci' | 'chore' 
  | 'revert' | 'wip' | 'merge';

// Commit scope represents the affected module/component
export interface CommitScope {
  name: string;
  priority: number;
  aliases: string[];
}

// Conventional commit message structure
export interface ConventionalCommitMessage {
  type: ConventionalCommitType;
  scope?: string;
  subject: string;
  body?: string;
  footer?: string;
  breaking: boolean;
  breakingDescription?: string;
  issueReferences: string[];
  coAuthors: string[];
}

// Extended commit message with metadata
export interface CommitMessage extends ConventionalCommitMessage {
  id?: string;
  hash?: string;
  timestamp?: Date;
  author?: string;
  email?: string;
  generated: boolean;
  confidence: number;
  suggestions: CommitSuggestion[];
  language: string;
  diffSummary?: string;
}

// Diff file change
export interface DiffFile {
  path: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  language?: string;
  isTest: boolean;
  isConfig: boolean;
  isDocs: boolean;
  isBuild: boolean;
}

// Diff hunk for detailed changes
export interface DiffHunk {
  header: string;
  lines: DiffLine[];
  startLine: number;
  lineCount: number;
}

// Individual diff line
export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  lineNumber?: number;
}

// Parsed diff result
export interface DiffResult {
  files: DiffFile[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
  isBinary: boolean;
  rawDiff?: string;
}

// Semantic analysis result
export interface SemanticAnalysis {
  intent: CommitIntent;
  impact: ImpactLevel;
  affectedAreas: string[];
  complexity: ComplexityLevel;
  riskLevel: RiskLevel;
  suggestedScope: string;
  keywords: string[];
  extractedFeatures: string[];
  bugsFixed: string[];
  performanceChanges: string[];
  breakingSignals: BreakingSignal[];
}

// Intent classification
export type CommitIntent = 
  | 'feature' | 'bugfix' | 'refactoring' 
  | 'documentation' | 'optimization' | 'testing'
  | 'configuration' | 'dependency' | 'security'
  | 'localization' | 'formatting' | 'cleanup'
  | 'revert' | 'merge' | 'unknown';

// Impact levels
export type ImpactLevel = 'critical' | 'major' | 'minor' | 'trivial';
export type ComplexityLevel = 'high' | 'medium' | 'low';
export type RiskLevel = 'high' | 'medium' | 'low';

// Breaking change signals
export interface BreakingSignal {
  type: BreakingSignalType;
  description: string;
  location?: string;
  confidence: number;
}

export type BreakingSignalType = 
  | 'api-removal' | 'api-change' | 'config-removal' 
  | 'dependency-upgrade' | 'schema-change' | 'env-change'
  | 'permission-change' | 'behavioral-change';

// Analysis result combining all analysis
export interface AnalysisResult {
  semantic: SemanticAnalysis;
  diff: DiffResult;
  conventional: ConventionalCommitMessage;
  suggestions: CommitSuggestion[];
  breakingChanges: BreakingSignal[];
  linkedIssues: IssueReference[];
  language: string;
  timestamp: Date;
}

// Commit suggestions
export interface CommitSuggestion {
  type: SuggestionType;
  message: string;
  priority: 'high' | 'medium' | 'low';
  autoApply: boolean;
}

export type SuggestionType = 
  | 'add-scope' | 'split-commit' | 'add-tests' 
  | 'update-docs' | 'add-changelog' | 'add-coauthor'
  | 'consider-refactor' | 'add-warning' | 'split-pr'
  | 'squash-commits' | 'add-issue-link';

// Issue/PR reference
export interface IssueReference {
  type: 'issue' | 'pull-request' | 'commit';
  id: string;
  url?: string;
  title?: string;
  status?: string;
  confidence: number;
}

// Team commit style profile
export interface CommitStyle {
  preferredTypes: Map<ConventionalCommitType, number>;
  preferredScopes: string[];
  commonPatterns: string[];
  maxSubjectLength: number;
  useBody: boolean;
  useFooter: boolean;
  includeEmoji: boolean;
  breakingChangeFormat: string;
  issuePattern: string;
  language: string;
  conventions: string[];
  examples: string[];
}

// Historical commit for learning
export interface HistoricalCommit {
  hash: string;
  message: ConventionalCommitMessage;
  timestamp: Date;
  author: string;
  files: string[];
  additions: number;
  deletions: number;
}

// Auto-squash group
export interface SquashGroup {
  type: ConventionalCommitType;
  scope?: string;
  commits: HistoricalCommit[];
  combinedSubject: string;
  combinedBody?: string;
}

// Changelog entry
export interface ChangelogEntry {
  version: string;
  date: Date;
  type: ConventionalCommitType;
  scope?: string;
  subject: string;
  breaking: boolean;
  issueReferences: string[];
  author?: string;
}

// Changelog section
export interface ChangelogSection {
  type: ConventionalCommitType;
  entries: ChangelogEntry[];
}

// Generated changelog
export interface Changelog {
  title: string;
  version: string;
  date: Date;
  sections: ChangelogSection[];
  unreleased?: ChangelogEntry[];
  breakingChanges: ChangelogEntry[];
}

// Interactive commit crafting state
export interface CommitCraftState {
  step: CommitCraftStep;
  selectedType?: ConventionalCommitType;
  selectedScope?: string;
  subject?: string;
  body?: string;
  footer?: string;
  breaking?: boolean;
  linkedIssues?: IssueReference[];
  coAuthors?: string[];
  reviewComments?: string[];
}

export type CommitCraftStep = 
  | 'type' | 'scope' | 'subject' | 'body' 
  | 'breaking' | 'issues' | 'review' | 'confirm';

// Configuration options
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
  styleProfile: Partial<CommitStyle>;
  learningEnabled: boolean;
  learningDataPath: string;
  changelogPath: string;
  maxSubjectLength: number;
  includeEmoji: boolean;
  gitHookMode: 'commit-msg' | 'prepare-commit-msg' | 'none';
  suggestSquash: boolean;
  detectBreaking: boolean;
  multiLanguage: boolean;
  supportedLanguages: string[];
}

// API Response types
export interface AICommitRequest {
  diff: DiffResult;
  context: {
    recentCommits: ConventionalCommitMessage[];
    styleProfile: CommitStyle;
    language: string;
    conventionalCommits: boolean;
  };
  options?: {
    maxLength?: number;
    includeExamples?: boolean;
    temperature?: number;
  };
}

export interface AICommitResponse {
  message: ConventionalCommitMessage;
  confidence: number;
  alternatives: ConventionalCommitMessage[];
  explanation: string;
  suggestions: CommitSuggestion[];
}
