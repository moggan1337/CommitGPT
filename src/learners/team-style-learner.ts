/**
 * Team Style Learner
 * 
 * Analyzes commit history to learn and adapt to team conventions.
 * Uses pattern recognition to suggest commits that match team style.
 */

import {
  HistoricalCommit,
  CommitStyle,
  ConventionalCommitType,
} from '../core/types';

// Type frequency weights
const TYPE_PRIORITY: Record<ConventionalCommitType, number> = {
  feat: 10,
  fix: 9,
  docs: 7,
  style: 6,
  refactor: 8,
  perf: 7,
  test: 6,
  build: 5,
  ci: 5,
  chore: 4,
  revert: 3,
  wip: 2,
  merge: 1,
};

export class TeamStyleLearner {
  /**
   * Learn commit style from historical commits
   */
  async learn(commits: HistoricalCommit[]): Promise<CommitStyle> {
    if (commits.length === 0) {
      return this.getDefaultStyle();
    }

    // Analyze patterns
    const typeFrequency = this.analyzeTypeFrequency(commits);
    const scopes = this.analyzeScopes(commits);
    const patterns = this.analyzePatterns(commits);
    const metrics = this.analyzeMetrics(commits);
    const conventions = this.extractConventions(commits);

    // Build style profile
    return {
      preferredTypes: typeFrequency,
      preferredScopes: scopes,
      commonPatterns: patterns,
      maxSubjectLength: metrics.maxSubjectLength,
      useBody: metrics.useBody,
      useFooter: metrics.useFooter,
      includeEmoji: metrics.includeEmoji,
      breakingChangeFormat: this.detectBreakingFormat(commits),
      issuePattern: this.detectIssuePattern(commits),
      language: this.detectLanguage(commits),
      conventions,
      examples: this.getExamples(commits),
    };
  }

  /**
   * Analyze type frequency
   */
  private analyzeTypeFrequency(commits: HistoricalCommit[]): Map<ConventionalCommitType, number> {
    const counts = new Map<ConventionalCommitType, number>();
    let total = 0;

    for (const commit of commits) {
      const type = commit.message.type;
      counts.set(type, (counts.get(type) || 0) + 1);
      total++;
    }

    // Convert to priority map
    const priorities = new Map<ConventionalCommitType, number>();
    for (const [type, count] of counts) {
      const frequency = count / total;
      const priority = TYPE_PRIORITY[type] || 5;
      priorities.set(type, priority * frequency);
    }

    return priorities;
  }

  /**
   * Analyze scopes used
   */
  private analyzeScopes(commits: HistoricalCommit[]): string[] {
    const scopeCounts = new Map<string, number>();

    for (const commit of commits) {
      const scope = commit.message.scope;
      if (scope) {
        scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
      }
    }

    // Sort by frequency and return top scopes
    return Array.from(scopeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([scope]) => scope);
  }

  /**
   * Analyze common patterns in subjects
   */
  private analyzePatterns(commits: HistoricalCommit[]): string[] {
    const patterns: string[] = [];
    const subjects = commits.map(c => c.message.subject.toLowerCase());

    // Common verb patterns
    const verbs = ['add', 'fix', 'update', 'remove', 'improve', 'refactor', 'implement'];
    for (const verb of verbs) {
      const count = subjects.filter(s => s.startsWith(verb)).length;
      if (count > commits.length * 0.05) {
        patterns.push(`^${verb}\\s+`);
      }
    }

    // Patterns with "the"
    const withTheCount = subjects.filter(s => /\bthe\b/.test(s)).length;
    if (withTheCount > commits.length * 0.3) {
      patterns.push('\\bthe\\s+');
    }

    // Patterns with "and"
    const withAndCount = subjects.filter(s => /\band\b/.test(s)).length;
    if (withAndCount > commits.length * 0.1) {
      patterns.push('\\band\\s+');
    }

    return patterns;
  }

  /**
   * Analyze commit metrics
   */
  private analyzeMetrics(commits: HistoricalCommit[]): {
    maxSubjectLength: number;
    useBody: number;
    useFooter: number;
    includeEmoji: boolean;
  } {
    let totalSubjectLength = 0;
    let bodyCount = 0;
    let footerCount = 0;
    let emojiCount = 0;

    for (const commit of commits) {
      totalSubjectLength += commit.message.subject.length;
      
      if (commit.message.body && commit.message.body.length > 10) {
        bodyCount++;
      }
      
      if (commit.message.footer) {
        footerCount++;
      }
      
      // Check for emoji at start of subject
      const emojiPattern = /^[\u{1F300}-\u{1F9FF}]/u;
      if (emojiPattern.test(commit.message.subject)) {
        emojiCount++;
      }
    }

    return {
      maxSubjectLength: Math.round(totalSubjectLength / commits.length) + 10,
      useBody: bodyCount / commits.length,
      useFooter: footerCount / commits.length,
      includeEmoji: emojiCount > commits.length * 0.1,
    };
  }

  /**
   * Detect breaking change format
   */
  private detectBreakingFormat(commits: HistoricalCommit[]): string {
    // Check for different formats
    const formats = {
      exclamation: commits.filter(c => c.message.subject.includes('!')).length,
      footer: commits.filter(c => c.message.footer?.includes('BREAKING')).length,
      both: commits.filter(c => 
        c.message.subject.includes('!') && 
        c.message.footer?.includes('BREAKING')
      ).length,
    };

    if (formats.footer > formats.exclamation * 2) {
      return 'footer';
    }
    if (formats.exclamation > 0) {
      return 'exclamation';
    }
    return 'either';
  }

  /**
   * Detect issue reference pattern
   */
  private detectIssuePattern(commits: HistoricalCommit[]): string {
    const patterns: Record<string, number> = {
      '#(\\d+)': 0,
      'GH-(\\d+)': 0,
      '([A-Z]+-\\d+)': 0,
      '!(\\d+)': 0,
    };

    for (const commit of commits) {
      for (const ref of commit.message.issueReferences) {
        if (/^#?\d+$/.test(ref)) {
          patterns['#(\\d+)']++;
        } else if (/^GH-\d+$/i.test(ref)) {
          patterns['GH-(\\d+)']++;
        } else if (/^[A-Z]+-\d+$/.test(ref)) {
          patterns['([A-Z]+-\\d+)']++;
        } else if (/^!\d+$/.test(ref)) {
          patterns['!(\\d+)']++;
        }
      }
    }

    // Return most common pattern
    return Object.entries(patterns)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '#(\\d+)';
  }

  /**
   * Detect commit language
   */
  private detectLanguage(commits: HistoricalCommit[]): string {
    // Simple language detection based on common words
    const languages: Record<string, string[]> = {
      en: ['add', 'fix', 'update', 'remove', 'improve', 'implement', 'create', 'delete'],
      es: ['agregar', 'corregir', 'actualizar', 'eliminar', 'mejorar', 'implementar'],
      fr: ['ajouter', 'corriger', 'mettre à jour', 'supprimer', 'améliorer'],
      de: ['hinzufügen', 'beheben', 'aktualisieren', 'entfernen', 'verbessern'],
      zh: ['添加', '修复', '更新', '删除', '改进', '实现'],
    };

    const counts: Record<string, number> = {};
    
    for (const [lang, words] of Object.entries(languages)) {
      counts[lang] = 0;
      for (const commit of commits) {
        const subject = commit.message.subject.toLowerCase();
        for (const word of words) {
          if (subject.includes(word)) {
            counts[lang]++;
          }
        }
      }
    }

    const detected = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0];

    return detected[1] > 0 ? detected[0] : 'en';
  }

  /**
   * Extract conventions
   */
  private extractConventions(commits: HistoricalCommit[]): string[] {
    const conventions: string[] = [];

    // Check for imperative mood
    const imperativeCount = commits.filter(c => {
      const subject = c.message.subject;
      const firstWord = subject.split(' ')[0].toLowerCase();
      const nonImperative = ['added', 'fixed', 'updated', 'removed', 'implemented'];
      return !nonImperative.includes(firstWord);
    }).length;

    if (imperativeCount > commits.length * 0.6) {
      conventions.push('Use imperative mood');
    }

    // Check for lowercase first letter
    const lowercaseCount = commits.filter(c => {
      const firstChar = c.message.subject[0];
      return firstChar === firstChar.toLowerCase();
    }).length;

    if (lowercaseCount > commits.length * 0.8) {
      conventions.push('Start with lowercase');
    }

    // Check for period at end
    const noPeriodCount = commits.filter(c => {
      return !c.message.subject.endsWith('.');
    }).length;

    if (noPeriodCount > commits.length * 0.9) {
      conventions.push('No period at end');
    }

    // Check for conventional format
    const conventionalCount = commits.filter(c => {
      return c.message.type !== 'chore'; // Basic check
    }).length;

    if (conventionalCount > commits.length * 0.5) {
      conventions.push('Use conventional commit format');
    }

    return conventions;
  }

  /**
   * Get example commits
   */
  private getExamples(commits: HistoricalCommit[]): string[] {
    // Get diverse examples from different types
    const examples: string[] = [];
    const types = new Set<ConventionalCommitType>();

    for (const commit of commits) {
      if (examples.length >= 10) break;
      if (!types.has(commit.message.type)) {
        types.add(commit.message.type);
        examples.push(commit.message.subject);
      }
    }

    return examples;
  }

  /**
   * Get default style
   */
  private getDefaultStyle(): CommitStyle {
    return {
      preferredTypes: new Map([
        ['feat', 8],
        ['fix', 7],
        ['docs', 5],
        ['refactor', 6],
        ['test', 4],
        ['chore', 3],
      ]),
      preferredScopes: [],
      commonPatterns: [],
      maxSubjectLength: 72,
      useBody: false,
      useFooter: true,
      includeEmoji: false,
      breakingChangeFormat: 'either',
      issuePattern: '#(\\d+)',
      language: 'en',
      conventions: ['Use conventional commit format'],
      examples: [],
    };
  }

  /**
   * Merge multiple style profiles
   */
  merge(styles: CommitStyle[]): CommitStyle {
    if (styles.length === 0) {
      return this.getDefaultStyle();
    }

    if (styles.length === 1) {
      return styles[0];
    }

    // Merge type preferences
    const mergedTypes = new Map<ConventionalCommitType, number>();
    for (const style of styles) {
      for (const [type, priority] of style.preferredTypes) {
        mergedTypes.set(type, (mergedTypes.get(type) || 0) + priority / styles.length);
      }
    }

    // Merge scopes
    const scopeCounts = new Map<string, number>();
    for (const style of styles) {
      for (const scope of style.preferredScopes) {
        scopeCounts.set(scope, (scopeCounts.get(scope) || 0) + 1);
      }
    }
    const mergedScopes = Array.from(scopeCounts.entries())
      .filter(([, count]) => count >= styles.length / 2)
      .sort((a, b) => b[1] - a[1])
      .map(([scope]) => scope);

    // Average metrics
    const avgSubjectLength = styles.reduce((sum, s) => sum + s.maxSubjectLength, 0) / styles.length;
    const avgUseBody = styles.reduce((sum, s) => sum + (s.useBody ? 1 : 0), 0) / styles.length;
    const avgUseFooter = styles.reduce((sum, s) => sum + (s.useFooter ? 1 : 0), 0) / styles.length;
    const emojiCount = styles.filter(s => s.includeEmoji).length;
    const includeEmoji = emojiCount > styles.length / 2;

    // Detect language (most common)
    const langCounts = new Map<string, number>();
    for (const style of styles) {
      langCounts.set(style.language, (langCounts.get(style.language) || 0) + 1);
    }
    const language = Array.from(langCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'en';

    return {
      preferredTypes: mergedTypes,
      preferredScopes: mergedScopes,
      commonPatterns: styles[0].commonPatterns, // Use first style's patterns
      maxSubjectLength: Math.round(avgSubjectLength),
      useBody: avgUseBody > 0.3,
      useFooter: avgUseFooter > 0.3,
      includeEmoji,
      breakingChangeFormat: styles[0].breakingChangeFormat,
      issuePattern: styles[0].issuePattern,
      language,
      conventions: styles[0].conventions,
      examples: styles[0].examples,
    };
  }

  /**
   * Adapt style based on feedback
   */
  adapt(style: CommitStyle, feedback: {
    accepted: boolean;
    originalMessage: string;
    userMessage?: string;
  }): CommitStyle {
    const adapted = { ...style };
    
    // If user modified the message, analyze the changes
    if (feedback.userMessage && feedback.userMessage !== feedback.originalMessage) {
      // Extract patterns from user's modification
      const userLower = feedback.userMessage.toLowerCase();
      
      // Check for scope usage
      const scopeMatch = feedback.userMessage.match(/\(([^)]+)\)/);
      if (scopeMatch) {
        const scope = scopeMatch[1];
        if (!adapted.preferredScopes.includes(scope)) {
          adapted.preferredScopes = [scope, ...adapted.preferredScopes].slice(0, 20);
        }
      }

      // Check for type usage
      const typeMatch = feedback.userMessage.match(/^(\w+)(\(|:)/);
      if (typeMatch) {
        const type = typeMatch[1] as ConventionalCommitType;
        if (['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'].includes(type)) {
          const current = adapted.preferredTypes.get(type) || 0;
          adapted.preferredTypes.set(type, current + 1);
        }
      }
    }

    return adapted;
  }
}
