/**
 * CommitGPT - Intelligent Commit Message Generator
 * 
 * An AI-powered tool for generating meaningful, conventional commit messages
 * with semantic diff analysis, team style learning, and changelog generation.
 * 
 * @author moggan1337
 * @license MIT
 */

export { CommitGPT } from './core/commit-gpt';
export { SemanticAnalyzer } from './analyzers/semantic-analyzer';
export { ConventionalCommitFormatter } from './analyzers/conventional-commit-formatter';
export { BreakingChangeDetector } from './analyzers/breaking-change-detector';
export { IssueLinker } from './analyzers/issue-linker';
export { MultiLanguageSupport } from './analyzers/multi-language-support';
export { CommitHistoryAnalyzer } from './analyzers/commit-history-analyzer';
export { TeamStyleLearner } from './learners/team-style-learner';
export { InteractiveCommitCrafter } from './generators/interactive-commit-crafter';
export { AutoSquashSuggester } from './generators/auto-squash-suggester';
export { ChangelogGenerator } from './generators/changelog-generator';
export { DiffParser } from './utils/diff-parser';
export { GitManager } from './utils/git-manager';
export { ConfigManager } from './utils/config-manager';
export type { CommitMessage, DiffResult, AnalysisResult, CommitStyle } from './core/types';
