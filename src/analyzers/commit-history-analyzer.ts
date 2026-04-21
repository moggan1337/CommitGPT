/**
 * Commit History Analyzer
 * 
 * Analyzes git commit history to extract patterns, learn team conventions,
 * and provide insights for better commit messages.
 */

import {
  HistoricalCommit,
  ConventionalCommitMessage,
  DiffResult,
  ConventionalCommitType,
} from '../core/types';
import { GitManager } from '../utils/git-manager';
import { ConventionalCommitFormatter } from './conventional-commit-formatter';

// Type distribution stats
interface TypeStats {
  type: ConventionalCommitType;
  count: number;
  percentage: number;
  avgSubjectLength: number;
  avgBodyLength: number;
  examples: string[];
}

// Scope distribution stats
interface ScopeStats {
  scope: string;
  count: number;
  percentage: number;
  associatedTypes: ConventionalCommitType[];
  examples: string[];
}

// Commit pattern
interface CommitPattern {
  regex: RegExp;
  type: ConventionalCommitType;
  description: string;
  example: string;
}

// Common commit patterns
const COMMIT_PATTERNS: CommitPattern[] = [
  {
    regex: /\b(add|introduce|implement|create|new)\s+(?:the\s+)?(\w+)/i,
    type: 'feat',
    description: 'New feature or functionality',
    example: 'add user authentication',
  },
  {
    regex: /\b(fix|fixes|fixed|bug|resolve)\s+(?:the\s+)?(\w+)/i,
    type: 'fix',
    description: 'Bug fix',
    example: 'fix login error',
  },
  {
    regex: /\b(update|add|create|improve)\s+(?:the\s+)?(?:docs?|readme|documentation)/i,
    type: 'docs',
    description: 'Documentation changes',
    example: 'update documentation',
  },
  {
    regex: /\b(refactor|restructure|rewrite|clean)\s+(?:the\s+)?(\w+)/i,
    type: 'refactor',
    description: 'Code refactoring',
    example: 'refactor user service',
  },
  {
    regex: /\b(optimize|improve|perf|speed)\s+(?:the\s+)?(\w+)/i,
    type: 'perf',
    description: 'Performance improvement',
    example: 'optimize database queries',
  },
  {
    regex: /\b(test|spec|coverage|unit)\s+(?:the\s+)?(\w+)/i,
    type: 'test',
    description: 'Test changes',
    example: 'test user service',
  },
  {
    regex: /\b(update|change|modify|config)\s+(?:the\s+)?(.+)/i,
    type: 'chore',
    description: 'Maintenance or configuration',
    example: 'update dependencies',
  },
];

export class CommitHistoryAnalyzer {
  private formatter: ConventionalCommitFormatter;

  constructor() {
    this.formatter = new ConventionalCommitFormatter();
  }

  /**
   * Analyze commits from git history
   */
  async analyzeFromGit(
    gitManager: GitManager,
    maxCommits: number = 500
  ): Promise<HistoricalCommit[]> {
    const commits = await gitManager.getCommits([], maxCommits);
    return this.analyzeCommits(commits);
  }

  /**
   * Analyze a list of commits
   */
  analyzeCommits(commits: any[]): HistoricalCommit[] {
    return commits.map(commit => this.parseCommit(commit)).filter(Boolean) as HistoricalCommit[];
  }

  /**
   * Parse a single commit into structured format
   */
  parseCommit(commit: any): HistoricalCommit | null {
    try {
      const message = commit.message || commit.title || '';
      
      // Parse conventional commit format
      const conventional = this.formatter.parse(message);
      
      if (!conventional) {
        // Try to extract what we can
        return {
          hash: commit.hash || commit.sha || '',
          message: {
            type: 'chore',
            subject: message.split('\n')[0],
            breaking: false,
            issueReferences: [],
            coAuthors: [],
          },
          timestamp: new Date(commit.date || commit.timestamp),
          author: commit.author?.name || commit.authorName || '',
          files: commit.files || [],
          additions: commit.additions || 0,
          deletions: commit.deletions || 0,
        };
      }

      return {
        hash: commit.hash || commit.sha || '',
        message: conventional,
        timestamp: new Date(commit.date || commit.timestamp),
        author: commit.author?.name || commit.authorName || '',
        files: commit.files || [],
        additions: commit.additions || 0,
        deletions: commit.deletions || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate type distribution statistics
   */
  calculateTypeDistribution(commits: HistoricalCommit[]): TypeStats[] {
    const typeMap = new Map<ConventionalCommitType, TypeStats>();
    
    for (const commit of commits) {
      const type = commit.message.type;
      
      if (!typeMap.has(type)) {
        typeMap.set(type, {
          type,
          count: 0,
          percentage: 0,
          avgSubjectLength: 0,
          avgBodyLength: 0,
          examples: [],
        });
      }
      
      const stats = typeMap.get(type)!;
      stats.count++;
      stats.avgSubjectLength += commit.message.subject.length;
      stats.avgBodyLength += (commit.message.body?.length || 0);
      
      if (stats.examples.length < 3) {
        stats.examples.push(commit.message.subject);
      }
    }

    // Calculate percentages and averages
    const total = commits.length;
    const results: TypeStats[] = [];
    
    for (const stats of typeMap.values()) {
      stats.percentage = (stats.count / total) * 100;
      stats.avgSubjectLength /= stats.count;
      stats.avgBodyLength /= stats.count;
      results.push(stats);
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate scope distribution statistics
   */
  calculateScopeDistribution(commits: HistoricalCommit[]): ScopeStats[] {
    const scopeMap = new Map<string, ScopeStats>();
    
    for (const commit of commits) {
      const scope = commit.message.scope || '(none)';
      
      if (!scopeMap.has(scope)) {
        scopeMap.set(scope, {
          scope,
          count: 0,
          percentage: 0,
          associatedTypes: [],
          examples: [],
        });
      }
      
      const stats = scopeMap.get(scope)!;
      stats.count++;
      
      if (!stats.associatedTypes.includes(commit.message.type)) {
        stats.associatedTypes.push(commit.message.type);
      }
      
      if (stats.examples.length < 2) {
        stats.examples.push(commit.message.subject);
      }
    }

    const total = commits.length;
    const results: ScopeStats[] = [];
    
    for (const stats of scopeMap.values()) {
      stats.percentage = (stats.count / total) * 100;
      results.push(stats);
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Identify common patterns in commit messages
   */
  identifyPatterns(commits: HistoricalCommit[]): CommitPattern[] {
    const matchedPatterns: Map<string, number> = new Map();
    
    for (const commit of commits) {
      for (const pattern of COMMIT_PATTERNS) {
        if (pattern.regex.test(commit.message.subject)) {
          const key = pattern.type;
          matchedPatterns.set(key, (matchedPatterns.get(key) || 0) + 1);
        }
      }
    }

    // Return patterns sorted by frequency
    return COMMIT_PATTERNS.filter(p => matchedPatterns.has(p.type))
      .sort((a, b) => (matchedPatterns.get(b.type) || 0) - (matchedPatterns.get(a.type) || 0));
  }

  /**
   * Calculate average commit metrics
   */
  calculateMetrics(commits: HistoricalCommit[]): {
    avgSubjectLength: number;
    avgBodyLength: number;
    avgFilesChanged: number;
    avgAdditions: number;
    avgDeletions: number;
    conventionalCompliance: number;
    mostActiveDay: string;
    mostActiveHour: number;
  } {
    if (commits.length === 0) {
      return {
        avgSubjectLength: 0,
        avgBodyLength: 0,
        avgFilesChanged: 0,
        avgAdditions: 0,
        avgDeletions: 0,
        conventionalCompliance: 0,
        mostActiveDay: 'Unknown',
        mostActiveHour: 12,
      };
    }

    let totalSubjectLength = 0;
    let totalBodyLength = 0;
    let totalFiles = 0;
    let totalAdditions = 0;
    let totalDeletions = 0;
    let conventionalCount = 0;
    const dayCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    for (const commit of commits) {
      totalSubjectLength += commit.message.subject.length;
      totalBodyLength += commit.message.body?.length || 0;
      totalFiles += commit.files?.length || 0;
      totalAdditions += commit.additions;
      totalDeletions += commit.deletions;

      // Check conventional format
      if (this.isConventional(commit.message)) {
        conventionalCount++;
      }

      // Track activity
      const day = commit.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = commit.timestamp.getHours();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    // Find most active day and hour
    const mostActiveDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
    const mostActiveHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 12;

    return {
      avgSubjectLength: totalSubjectLength / commits.length,
      avgBodyLength: totalBodyLength / commits.length,
      avgFilesChanged: totalFiles / commits.length,
      avgAdditions: totalAdditions / commits.length,
      avgDeletions: totalDeletions / commits.length,
      conventionalCompliance: (conventionalCount / commits.length) * 100,
      mostActiveDay,
      mostActiveHour,
    };
  }

  /**
   * Check if commit follows conventional format
   */
  isConventional(message: ConventionalCommitMessage): boolean {
    if (!message.type) return false;
    
    const typePattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|wip|merge)$/;
    if (!typePattern.test(message.type)) return false;
    
    if (!message.subject || message.subject.length === 0) return false;
    if (message.subject.length > 72) return false;
    if (message.subject.endsWith('.')) return false;
    
    return true;
  }

  /**
   * Get commit style recommendations
   */
  getRecommendations(commits: HistoricalCommit[]): string[] {
    const recommendations: string[] = [];
    const metrics = this.calculateMetrics(commits);
    const typeStats = this.calculateTypeDistribution(commits);

    // Subject length recommendations
    if (metrics.avgSubjectLength > 60) {
      recommendations.push(
        'Consider keeping commit subjects under 60 characters for better readability.'
      );
    }

    // Conventional commit recommendations
    if (metrics.conventionalCompliance < 50) {
      recommendations.push(
        'Only ' + metrics.conventionalCompliance.toFixed(0) + '% of commits follow conventional format. ' +
        'Consider using conventional commits for better automation.'
      );
    }

    // Type balance recommendations
    const choreRatio = typeStats.find(t => t.type === 'chore')?.percentage || 0;
    if (choreRatio > 30) {
      recommendations.push(
        'High proportion of chore commits (' + choreRatio.toFixed(0) + '%). ' +
        'Consider if some should be categorized differently.'
      );
    }

    // Body usage recommendations
    if (metrics.avgBodyLength < 10 && commits.length > 10) {
      recommendations.push(
        'Consider adding more context in commit bodies for complex changes.'
      );
    }

    return recommendations;
  }

  /**
   * Generate commit summary report
   */
  generateReport(commits: HistoricalCommit[]): string {
    const typeStats = this.calculateTypeDistribution(commits);
    const scopeStats = this.calculateScopeDistribution(commits);
    const metrics = this.calculateMetrics(commits);
    const patterns = this.identifyPatterns(commits);
    const recommendations = this.getRecommendations(commits);

    let report = '# Commit History Analysis Report\n\n';
    report += `Analyzed ${commits.length} commits\n\n`;

    // Type distribution
    report += '## Commit Type Distribution\n\n';
    report += '| Type | Count | Percentage | Avg Subject Length |\n';
    report += '|------|-------|------------|-------------------|\n';
    for (const stat of typeStats.slice(0, 10)) {
      report += `| ${stat.type} | ${stat.count} | ${stat.percentage.toFixed(1)}% | ${stat.avgSubjectLength.toFixed(0)} chars |\n`;
    }
    report += '\n';

    // Top scopes
    if (scopeStats.length > 0) {
      report += '## Top Scopes\n\n';
      report += '| Scope | Count | Percentage |\n';
      report += '|-------|-------|------------|\n';
      for (const stat of scopeStats.slice(0, 10)) {
        report += `| ${stat.scope} | ${stat.count} | ${stat.percentage.toFixed(1)}% |\n`;
      }
      report += '\n';
    }

    // Metrics
    report += '## Metrics\n\n';
    report += `- Average subject length: ${metrics.avgSubjectLength.toFixed(0)} characters\n`;
    report += `- Average body length: ${metrics.avgBodyLength.toFixed(0)} characters\n`;
    report += `- Average files changed: ${metrics.avgFilesChanged.toFixed(1)}\n`;
    report += `- Average additions: ${metrics.avgAdditions.toFixed(0)}\n`;
    report += `- Average deletions: ${metrics.avgDeletions.toFixed(0)}\n`;
    report += `- Conventional commit compliance: ${metrics.conventionalCompliance.toFixed(1)}%\n`;
    report += `- Most active day: ${metrics.mostActiveDay}\n\n`;

    // Recommendations
    if (recommendations.length > 0) {
      report += '## Recommendations\n\n';
      for (const rec of recommendations) {
        report += `- ${rec}\n`;
      }
      report += '\n';
    }

    // Common patterns
    if (patterns.length > 0) {
      report += '## Common Patterns\n\n';
      for (const pattern of patterns.slice(0, 5)) {
        report += `- **${pattern.type}**: ${pattern.description}\n`;
        report += `  Example: "${pattern.example}"\n`;
      }
    }

    return report;
  }
}
