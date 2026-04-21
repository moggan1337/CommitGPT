/**
 * Changelog Generator
 * 
 * Generates changelogs from git commit history following:
 * - Keep a Changelog convention
 * - Conventional Commits specification
 * - Semantic Versioning
 */

import {
  Changelog,
  ChangelogEntry,
  ChangelogSection,
  ConventionalCommitMessage,
  ConventionalCommitType,
} from '../core/types';
import { GitManager } from '../utils/git-manager';
import semver from 'semver';

// Type ordering for changelog sections
const TYPE_ORDER: ConventionalCommitType[] = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'build',
  'ci',
  'test',
  'docs',
  'style',
  'chore',
  'revert',
  'wip',
  'merge',
];

// Section titles
const SECTION_TITLES: Record<ConventionalCommitType, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  docs: 'Documentation',
  style: 'Styles',
  refactor: 'Code Refactoring',
  perf: 'Performance Improvements',
  test: 'Tests',
  build: 'Build System',
  ci: 'Continuous Integration',
  chore: 'Chores',
  revert: 'Reverts',
  wip: 'Work in Progress',
  merge: 'Merges',
};

export interface ChangelogOptions {
  fromVersion?: string;
  toVersion?: string;
  includeUnreleased?: boolean;
  format?: 'markdown' | 'json' | 'keepachangelog';
  breakingLabel?: string;
  fileHeader?: string;
  repository?: string;
}

export interface GitCommitInput {
  hash: string;
  message: string;
  title: string;
  authorName: string;
  authorEmail: string;
  date: string;
  timestamp: number;
}

export class ChangelogGenerator {
  private breakingLabel: string;
  private fileHeader: string;

  constructor(options?: { breakingLabel?: string; fileHeader?: string }) {
    this.breakingLabel = options?.breakingLabel || 'Breaking Changes';
    this.fileHeader = options?.fileHeader || '';
  }

  /**
   * Generate changelog from commits
   */
  generate(
    commits: GitCommitInput[],
    options?: ChangelogOptions
  ): Changelog {
    const {
      fromVersion,
      toVersion = 'Unreleased',
      includeUnreleased = true,
      format = 'markdown',
    } = options || {};

    // Parse commits into entries
    const entries = this.parseCommits(commits);

    // Separate breaking changes
    const breakingEntries = entries.filter(e => e.breaking);
    const regularEntries = entries.filter(e => !e.breaking);

    // Group by type
    const sections = this.groupByType(regularEntries);
    
    // Get unreleased entries (if any)
    const unreleased = fromVersion ? this.getUnreleasedEntries(commits, fromVersion) : [];

    return {
      title: 'Changelog',
      version: toVersion || 'Unreleased',
      date: new Date(),
      sections,
      unreleased: includeUnreleased && unreleased.length > 0 ? unreleased : undefined,
      breakingChanges: breakingEntries,
    };
  }

  /**
   * Parse commits into changelog entries
   */
  private parseCommits(commits: GitCommitInput[]): ChangelogEntry[] {
    const entries: ChangelogEntry[] = [];

    for (const commit of commits) {
      const entry = this.parseCommit(commit);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Parse a single commit into a changelog entry
   */
  private parseCommit(commit: GitCommitInput): ChangelogEntry | null {
    // Try to parse conventional commit format
    const conventional = this.parseConventionalCommit(commit.message);
    
    if (conventional) {
      return {
        version: '',
        date: new Date(commit.date),
        type: conventional.type,
        scope: conventional.scope,
        subject: conventional.subject,
        breaking: conventional.breaking,
        issueReferences: conventional.issueReferences,
        author: commit.authorName,
      };
    }

    // Fallback: try to extract type from message
    const type = this.inferType(commit.message);
    if (!type) return null;

    return {
      version: '',
      date: new Date(commit.date),
      type,
      subject: this.cleanSubject(commit.message),
      breaking: commit.message.includes('BREAKING'),
      issueReferences: this.extractIssueReferences(commit.message),
      author: commit.authorName,
    };
  }

  /**
   * Parse conventional commit format
   */
  private parseConventionalCommit(message: string): ConventionalCommitMessage | null {
    const headerPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
    const match = message.match(headerPattern);
    
    if (!match) return null;

    const [, type, scope, breaking, subject] = match;
    
    // Extract issue references from body/footer
    const issueRefs = this.extractIssueReferences(message);

    // Check for breaking in body
    const breakingInBody = /BREAKING\s*CHANGE:/i.test(message);

    return {
      type: type as ConventionalCommitType,
      scope,
      subject: subject.trim(),
      breaking: breaking === '!' || breakingInBody,
      issueReferences: issueRefs,
      coAuthors: [],
    };
  }

  /**
   * Infer commit type from message
   */
  private inferType(message: string): ConventionalCommitType | null {
    const lowerMessage = message.toLowerCase();

    const typeIndicators: Record<ConventionalCommitType, string[]> = {
      feat: ['feat', 'feature', 'add', 'new', 'introduce', 'implement'],
      fix: ['fix', 'bug', 'patch', 'resolve', 'correct'],
      docs: ['doc', 'readme', 'document'],
      style: ['style', 'format', 'lint'],
      refactor: ['refactor', 'restructure'],
      perf: ['perf', 'optimize', 'performance', 'speed'],
      test: ['test', 'spec', 'coverage'],
      build: ['build', 'package', 'bundle'],
      ci: ['ci', 'pipeline', 'github actions', 'travis', 'jenkins'],
      chore: ['chore', 'update', 'maintain'],
      revert: ['revert', 'undo'],
      wip: ['wip', 'work in progress'],
      merge: ['merge'],
    };

    for (const [type, indicators] of Object.entries(typeIndicators)) {
      for (const indicator of indicators) {
        if (lowerMessage.startsWith(indicator)) {
          return type as ConventionalCommitType;
        }
      }
    }

    return null;
  }

  /**
   * Clean subject line
   */
  private cleanSubject(message: string): string {
    // Remove type prefix if present
    let subject = message.replace(/^\w+(?:\([^)]+\))?!?:\s*/, '');
    
    // Remove footers
    const footerIndex = subject.indexOf('\n\n');
    if (footerIndex !== -1) {
      subject = subject.substring(0, footerIndex);
    }
    
    // Trim and lowercase first letter if it's a capital
    subject = subject.trim();
    if (subject.length > 0) {
      subject = subject[0].toLowerCase() + subject.slice(1);
    }
    
    return subject;
  }

  /**
   * Extract issue references from message
   */
  private extractIssueReferences(message: string): string[] {
    const refs: string[] = [];
    const patterns = [
      /#(\d+)/g,
      /(?:closes?|fixes?|resolves?)\s+#?(\d+)/gi,
      /([A-Z]+-\d+)/g,
    ];

    for (const pattern of patterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        refs.push(match[1] || match[0]);
      }
    }

    return [...new Set(refs)];
  }

  /**
   * Group entries by type
   */
  private groupByType(entries: ChangelogEntry[]): ChangelogSection[] {
    const groups = new Map<ConventionalCommitType, ChangelogEntry[]>();

    for (const entry of entries) {
      if (!groups.has(entry.type)) {
        groups.set(entry.type, []);
      }
      groups.get(entry.type)!.push(entry);
    }

    // Sort by type order
    const sections: ChangelogSection[] = [];
    
    for (const type of TYPE_ORDER) {
      const typeEntries = groups.get(type);
      if (typeEntries && typeEntries.length > 0) {
        sections.push({
          type,
          entries: typeEntries.sort((a, b) => b.date.getTime() - a.date.getTime()),
        });
      }
    }

    return sections;
  }

  /**
   * Get unreleased entries
   */
  private getUnreleasedEntries(commits: GitCommitInput[], sinceVersion: string): ChangelogEntry[] {
    // This would typically compare tags
    // For now, return all commits as unreleased
    return this.parseCommits(commits);
  }

  /**
   * Format changelog as Markdown
   */
  formatMarkdown(changelog: Changelog, options?: ChangelogOptions): string {
    const lines: string[] = [];
    
    // Header
    lines.push(`# ${changelog.title}`);
    lines.push('');

    // Version sections
    if (options?.fromVersion) {
      // Generate version history
      lines.push(`## [${changelog.version}]`);
    } else {
      lines.push(`## ${changelog.version}`);
    }
    
    if (changelog.date) {
      const dateStr = changelog.date.toISOString().split('T')[0];
      lines.push(`*${dateStr}*`);
    }
    lines.push('');

    // Breaking changes
    if (changelog.breakingChanges.length > 0) {
      lines.push(`### ${this.breakingLabel}`);
      lines.push('');
      for (const entry of changelog.breakingChanges) {
        lines.push(this.formatEntry(entry, options?.repository));
      }
      lines.push('');
    }

    // Regular sections
    for (const section of changelog.sections) {
      const title = SECTION_TITLES[section.type];
      if (!title) continue;

      lines.push(`### ${title}`);
      lines.push('');
      
      for (const entry of section.entries) {
        lines.push(this.formatEntry(entry, options?.repository));
      }
      lines.push('');
    }

    // Unreleased section
    if (changelog.unreleased && changelog.unreleased.length > 0) {
      lines.push('### Unreleased');
      lines.push('');
      for (const entry of changelog.unreleased) {
        lines.push(this.formatEntry(entry, options?.repository));
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Format a single changelog entry
   */
  private formatEntry(entry: ChangelogEntry, repository?: string): string {
    let line = `- `;

    // Add scope
    if (entry.scope) {
      line += `**${entry.scope}:** `;
    }

    // Add subject
    line += entry.subject;

    // Add issue reference
    if (entry.issueReferences.length > 0) {
      const refs = entry.issueReferences.map(ref => {
        if (repository) {
          return `[#${ref}](${repository}/issues/${ref})`;
        }
        return `#${ref}`;
      });
      line += ` (${refs.join(', ')})`;
    }

    return line;
  }

  /**
   * Format changelog as JSON
   */
  formatJson(changelog: Changelog): string {
    return JSON.stringify(changelog, null, 2);
  }

  /**
   * Format changelog in Keep a Changelog format
   */
  formatKeepAChangelog(changelog: Changelog): string {
    const lines: string[] = [];
    
    lines.push('# Changelog');
    lines.push('');
    lines.push('All notable changes to this project will be documented in this file.');
    lines.push('');
    lines.push('The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),');
    lines.push('and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).');
    lines.push('');
    lines.push(`## [${changelog.version}] - ${changelog.date.toISOString().split('T')[0]}`);
    lines.push('');

    // Breaking changes section
    if (changelog.breakingChanges.length > 0) {
      lines.push('### ⚠️ BREAKING CHANGES ###');
      lines.push('');
      for (const entry of changelog.breakingChanges) {
        lines.push(this.formatKeepAEntry(entry));
      }
      lines.push('');
    }

    // Regular sections
    for (const section of changelog.sections) {
      const title = SECTION_TITLES[section.type];
      if (!title) continue;

      lines.push(`### ${title}`);
      lines.push('');
      
      for (const entry of section.entries) {
        lines.push(this.formatKeepAEntry(entry));
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  /**
   * Format entry for Keep a Changelog format
   */
  private formatKeepAEntry(entry: ChangelogEntry): string {
    const scope = entry.scope ? `**${entry.scope}:** ` : '';
    const subject = entry.subject;
    const refs = entry.issueReferences.length > 0 
      ? ` (${entry.issueReferences.map(r => `#${r}`).join(', ')})`
      : '';
    
    return `- ${scope}${subject}${refs}`;
  }

  /**
   * Generate full changelog file content
   */
  generateFile(commits: GitCommitInput[], options?: ChangelogOptions): string {
    const changelog = this.generate(commits, options);
    
    switch (options?.format) {
      case 'json':
        return this.formatJson(changelog);
      case 'keepachangelog':
        return this.formatKeepAChangelog(changelog);
      default:
        return this.formatMarkdown(changelog, options);
    }
  }

  /**
   * Update existing changelog file
   */
  async updateChangelog(
    gitManager: GitManager,
    existingContent: string,
    options?: ChangelogOptions
  ): Promise<string> {
    // Get latest commits since last version
    const latestTag = await gitManager.getLatestTag();
    const commits = await gitManager.getCommitsSince(latestTag || 'HEAD', 100);
    
    // Generate new entries
    const newChangelog = this.generate(commits, {
      ...options,
      fromVersion: latestTag || undefined,
    });

    // Parse existing changelog to determine insertion point
    const versionPattern = /##\s*\[?(\d+\.\d+\.\d+)\]?/;
    const match = existingContent.match(versionPattern);
    
    if (match && match[1]) {
      // Insert before the previous version
      const insertIndex = existingContent.indexOf(match[0]);
      const newContent = existingContent.substring(0, insertIndex) +
        this.formatMarkdown(newChangelog, options) +
        '\n\n' + existingContent.substring(insertIndex);
      
      return newContent;
    }

    // No version found, prepend new content
    return this.formatMarkdown(newChangelog, options) + '\n\n' + existingContent;
  }

  /**
   * Detect version bump type from commits
   */
  detectVersionBump(commits: GitCommitInput[]): 'major' | 'minor' | 'patch' {
    const entries = this.parseCommits(commits);
    
    let hasBreaking = false;
    let hasFeature = false;
    let hasFix = false;

    for (const entry of entries) {
      if (entry.breaking) {
        hasBreaking = true;
      }
      if (entry.type === 'feat') {
        hasFeature = true;
      }
      if (entry.type === 'fix') {
        hasFix = true;
      }
    }

    if (hasBreaking) return 'major';
    if (hasFeature) return 'minor';
    if (hasFix) return 'patch';
    return 'patch';
  }

  /**
   * Generate next version tag
   */
  generateNextVersion(currentVersion: string, commits: GitCommitInput[]): string {
    const bump = this.detectVersionBump(commits);
    const current = semver.valid(currentVersion) 
      ? semver.coerce(currentVersion) 
      : { major: 0, minor: 0, patch: 0 };

    switch (bump) {
      case 'major':
        return `${(current?.major || 0) + 1}.0.0`;
      case 'minor':
        return `${current?.major || 0}.${(current?.minor || 0) + 1}.0`;
      case 'patch':
        return `${current?.major || 0}.${current?.minor || 0}.${(current?.patch || 0) + 1}`;
    }
  }
}
