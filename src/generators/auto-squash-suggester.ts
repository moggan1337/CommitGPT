/**
 * Auto-Squash Suggester
 * 
 * Analyzes commits to suggest logical groupings for squashing.
 * Groups related commits together for cleaner PR history.
 */

import {
  SquashGroup,
  HistoricalCommit,
  ConventionalCommitType,
} from '../core/types';
import Fuse from 'fuse.js';

// Similarity threshold for grouping
const SIMILARITY_THRESHOLD = 0.6;

// Commit grouping strategies
interface GroupingStrategy {
  name: string;
  description: string;
  priority: number;
}

const STRATEGIES: GroupingStrategy[] = [
  { name: 'type', description: 'Group by commit type (feat, fix, etc)', priority: 3 },
  { name: 'scope', description: 'Group by scope (api, ui, etc)', priority: 2 },
  { name: 'similarity', description: 'Group by message similarity', priority: 1 },
  { name: 'temporal', description: 'Group by time proximity', priority: 1 },
];

export class AutoSquashSuggester {
  private fuse: Fuse<HistoricalCommit>;

  constructor() {
    this.fuse = new Fuse([], {
      keys: ['message.subject', 'message.scope'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  /**
   * Suggest squash groups for commits
   */
  suggest(commits: HistoricalCommit[]): SquashGroup[] {
    if (commits.length === 0) {
      return [];
    }

    // Update fuse index
    this.fuse.setCollection(commits);

    // Apply different grouping strategies
    const groups = this.applyGroupingStrategies(commits);

    // Filter and rank groups
    const meaningfulGroups = groups
      .filter(g => g.commits.length > 1)
      .map(g => this.enhanceGroup(g))
      .sort((a, b) => b.commits.length - a.commits.length);

    return meaningfulGroups;
  }

  /**
   * Apply multiple grouping strategies
   */
  private applyGroupingStrategies(commits: HistoricalCommit[]): SquashGroup[] {
    const groups: SquashGroup[] = [];

    // Strategy 1: Group by type
    const typeGroups = this.groupByType(commits);
    groups.push(...typeGroups);

    // Strategy 2: Group by scope (within same type)
    const scopeGroups = this.groupByScope(commits);
    groups.push(...scopeGroups);

    // Strategy 3: Group by similarity
    const similarityGroups = this.groupBySimilarity(commits);
    groups.push(...similarityGroups);

    return groups;
  }

  /**
   * Group commits by type
   */
  private groupByType(commits: HistoricalCommit[]): SquashGroup[] {
    const groups = new Map<ConventionalCommitType, HistoricalCommit[]>();

    for (const commit of commits) {
      const type = commit.message.type;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(commit);
    }

    return Array.from(groups.entries())
      .filter(([, commits]) => commits.length > 1)
      .map(([type, groupCommits]) => ({
        type,
        commits: groupCommits,
        combinedSubject: this.generateCombinedSubject(groupCommits),
        combinedBody: this.generateCombinedBody(groupCommits),
      }));
  }

  /**
   * Group commits by scope
   */
  private groupByScope(commits: HistoricalCommit[]): SquashGroup[] {
    const groups: SquashGroup[] = [];

    // Group by type first
    const byType = new Map<ConventionalCommitType, HistoricalCommit[]>();
    for (const commit of commits) {
      const type = commit.message.type;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(commit);
    }

    // Then group by scope within each type
    for (const [, typeCommits] of byType) {
      const byScope = new Map<string, HistoricalCommit[]>();
      
      for (const commit of typeCommits) {
        const scope = commit.message.scope || '(no scope)';
        if (!byScope.has(scope)) {
          byScope.set(scope, []);
        }
        byScope.get(scope)!.push(commit);
      }

      for (const [scope, scopeCommits] of byScope) {
        if (scopeCommits.length > 1) {
          groups.push({
            type: scopeCommits[0].message.type,
            scope: scope === '(no scope)' ? undefined : scope,
            commits: scopeCommits,
            combinedSubject: this.generateCombinedSubject(scopeCommits),
            combinedBody: this.generateCombinedBody(scopeCommits),
          });
        }
      }
    }

    return groups;
  }

  /**
   * Group commits by message similarity
   */
  private groupBySimilarity(commits: HistoricalCommit[]): SquashGroup[] {
    const groups: SquashGroup[] = [];
    const used = new Set<string>();

    for (const commit of commits) {
      if (used.has(commit.hash)) continue;

      const similar = this.fuse.search(commit.message.subject);
      const similarCommits = similar
        .filter(s => s.score !== undefined && s.score < 1 - SIMILARITY_THRESHOLD)
        .map(s => s.item)
        .filter(c => !used.has(c.hash));

      if (similarCommits.length > 1) {
        const allCommits = [commit, ...similarCommits];
        allCommits.forEach(c => used.add(c.hash));

        groups.push({
          type: commit.message.type,
          scope: commit.message.scope,
          commits: allCommits,
          combinedSubject: this.generateCombinedSubject(allCommits),
          combinedBody: this.generateCombinedBody(allCommits),
        });
      }
    }

    return groups;
  }

  /**
   * Generate combined subject for squashed commits
   */
  private generateCombinedSubject(commits: HistoricalCommit[]): string {
    if (commits.length === 0) return '';
    if (commits.length === 1) return commits[0].message.subject;

    // Find common prefix
    const subjects = commits.map(c => c.message.subject.toLowerCase());
    const firstSubject = subjects[0];
    
    // Extract action verbs
    const actions = new Set<string>();
    for (const subject of subjects) {
      const words = subject.split(' ');
      if (words.length > 0) {
        actions.add(words[0]);
      }
    }

    // If same action, use singular
    if (actions.size === 1) {
      const action = Array.from(actions)[0];
      const commonPart = this.findCommonPart(subjects);
      return `${action} ${commonPart} (${commits.length} commits)`;
    }

    // Different actions, summarize
    const type = commits[0].message.type;
    const scope = commits[0].message.scope;
    const scopeStr = scope ? `${scope}: ` : ': ';
    
    return `${type}${scopeStr}${commits.length} related changes`;
  }

  /**
   * Find common part of subjects
   */
  private findCommonPart(subjects: string[]): string {
    if (subjects.length === 0) return '';
    if (subjects.length === 1) return subjects[0];

    let common = subjects[0];
    
    for (let i = 1; i < subjects.length; i++) {
      const subject = subjects[i];
      let j = 0;
      
      while (j < common.length && j < subject.length && common[j] === subject[j]) {
        j++;
      }
      
      common = common.substring(0, j);
      
      if (common.length < 3) break;
    }

    // Clean up common part
    common = common.trim();
    
    // Remove trailing words that might be cut off
    if (!common.endsWith(' ')) {
      const lastSpace = common.lastIndexOf(' ');
      if (lastSpace > 0) {
        common = common.substring(0, lastSpace);
      }
    }

    return common || subjects[0];
  }

  /**
   * Generate combined body for squashed commits
   */
  private generateCombinedBody(commits: HistoricalCommit[]): string | undefined {
    const lines: string[] = [];

    lines.push(`Squashed ${commits.length} commits:`);
    lines.push('');

    for (const commit of commits) {
      const shortHash = commit.hash.substring(0, 7);
      lines.push(`- ${shortHash} ${commit.message.subject}`);
    }

    return lines.join('\n');
  }

  /**
   * Enhance group with additional metadata
   */
  private enhanceGroup(group: SquashGroup): SquashGroup {
    // Add additional metadata
    return {
      ...group,
      // Keep original
    };
  }

  /**
   * Generate squash instructions
   */
  generateInstructions(groups: SquashGroup[]): string {
    if (groups.length === 0) {
      return 'No squashing recommended - commits appear unrelated.';
    }

    const lines: string[] = [
      '# Auto-Squash Suggestions',
      '',
      'The following commits could be logically grouped together:',
      '',
    ];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      
      lines.push(`## Group ${i + 1}: ${group.type}${group.scope ? `(${group.scope})` : ''}`);
      lines.push('');
      lines.push(`**Commits to squash:** ${group.commits.length}`);
      lines.push('');
      lines.push('```');
      for (const commit of group.commits) {
        const shortHash = commit.hash.substring(0, 7);
        lines.push(`${shortHash} ${commit.message.subject}`);
      }
      lines.push('```');
      lines.push('');
      lines.push(`**Suggested combined message:**`);
      lines.push(`\`${group.combinedSubject}\``);
      lines.push('');
      
      if (group.combinedBody) {
        lines.push('**Body:**');
        lines.push('```');
        lines.push(group.combinedBody);
        lines.push('```');
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('## How to Squash');
    lines.push('');
    lines.push('1. Run `git rebase -i HEAD~N` where N is the number of commits');
    lines.push('2. Mark commits to squash with `s` (squash) instead of `pick`');
    lines.push('3. Edit the commit message as suggested');
    lines.push('');
    lines.push('Or use GitHub UI to squash merge.');

    return lines.join('\n');
  }

  /**
   * Calculate potential savings
   */
  calculateSavings(groups: SquashGroup[]): {
    originalCount: number;
    suggestedCount: number;
    reduction: number;
    reductionPercent: number;
  } {
    const originalCount = groups.reduce((sum, g) => sum + g.commits.length, 0);
    const suggestedCount = groups.length;
    const reduction = originalCount - suggestedCount;
    const reductionPercent = originalCount > 0 ? (reduction / originalCount) * 100 : 0;

    return {
      originalCount,
      suggestedCount,
      reduction,
      reductionPercent,
    };
  }
}
