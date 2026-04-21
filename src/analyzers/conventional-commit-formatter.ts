/**
 * Conventional Commit Formatter
 * 
 * Formats commit messages according to the Conventional Commits specification.
 * Supports custom styles, multi-language, and breaking change detection.
 */

import {
  SemanticAnalysis,
  DiffResult,
  ConventionalCommitMessage,
  ConventionalCommitType,
  CommitStyle,
} from '../core/types';

// Conventional commit type aliases
const TYPE_ALIASES: Record<string, ConventionalCommitType> = {
  // Feature types
  'feat': 'feat',
  'feature': 'feat',
  'features': 'feat',
  'new': 'feat',
  'add': 'feat',
  
  // Fix types
  'fix': 'fix',
  'bugfix': 'fix',
  'bug': 'fix',
  'hotfix': 'fix',
  'patch': 'fix',
  
  // Documentation types
  'docs': 'docs',
  'doc': 'docs',
  'documentation': 'docs',
  'readme': 'docs',
  
  // Style types
  'style': 'style',
  'styles': 'style',
  'formatting': 'style',
  'format': 'style',
  
  // Refactoring types
  'refactor': 'refactor',
  'refactorings': 'refactor',
  'restructure': 'refactor',
  
  // Performance types
  'perf': 'perf',
  'performance': 'perf',
  'optimize': 'perf',
  'optimization': 'perf',
  
  // Testing types
  'test': 'test',
  'tests': 'test',
  'testing': 'test',
  'spec': 'test',
  
  // Build types
  'build': 'build',
  'builds': 'build',
  'buildsystem': 'build',
  
  // CI types
  'ci': 'ci',
  'cicd': 'ci',
  'pipeline': 'ci',
  
  // Chore types
  'chore': 'chore',
  'chores': 'chore',
  'maintenance': 'chore',
  'tooling': 'chore',
  
  // Revert
  'revert': 'revert',
  'reverts': 'revert',
  'undo': 'revert',
  
  // WIP
  'wip': 'wip',
  'work-in-progress': 'wip',
  'in-progress': 'wip',
  
  // Merge
  'merge': 'merge',
  'merges': 'merge',
};

// Intent to type mapping
const INTENT_TO_TYPE: Record<string, ConventionalCommitType> = {
  'feature': 'feat',
  'bugfix': 'fix',
  'refactoring': 'refactor',
  'documentation': 'docs',
  'optimization': 'perf',
  'testing': 'test',
  'configuration': 'build',
  'dependency': 'chore',
  'security': 'fix',
  'localization': 'feat',
  'formatting': 'style',
  'cleanup': 'chore',
  'revert': 'revert',
  'merge': 'merge',
  'unknown': 'chore',
};

// Type emoji mapping
const TYPE_EMOJI: Record<ConventionalCommitType, string> = {
  'feat': '✨',
  'fix': '🐛',
  'docs': '📝',
  'style': '💄',
  'refactor': '♻️',
  'perf': '⚡',
  'test': '🧪',
  'build': '📦',
  'ci': '👷',
  'chore': '🔧',
  'revert': '⏪',
  'wip': '🚧',
  'merge': '🔀',
};

// Breaking change indicators
const BREAKING_INDICATORS = [
  'breaking',
  'breaking-change',
  'breaks',
  '!:',
  'BREAKING',
];

// Issue reference patterns
const ISSUE_PATTERNS = [
  /(?:#|gh-|issues?\/)(\d+)/gi,
  /\((?:closes?|fixes?|resolves?)\s+#?(\d+)\)/gi,
  /\[(?:closes?|fixes?|resolves?)\s+#?(\d+)\]/gi,
];

export interface FormatOptions {
  style?: CommitStyle | null;
  conventional?: boolean;
  language?: string;
  includeEmoji?: boolean;
  maxSubjectLength?: number;
}

/**
 * Conventional Commit Formatter
 */
export class ConventionalCommitFormatter {
  private defaultMaxSubjectLength: number;

  constructor(maxSubjectLength: number = 72) {
    this.defaultMaxSubjectLength = maxSubjectLength;
  }

  /**
   * Format analysis results into a conventional commit message
   */
  format(
    semantic: SemanticAnalysis,
    diff: DiffResult,
    options?: FormatOptions
  ): ConventionalCommitMessage {
    const {
      style = null,
      conventional = true,
      language = 'en',
      includeEmoji = false,
      maxSubjectLength = this.defaultMaxSubjectLength,
    } = options || {};

    // Determine commit type from intent
    const type = INTENT_TO_TYPE[semantic.intent] || 'chore';
    
    // Determine scope
    const scope = this.determineScope(semantic, diff, style);
    
    // Generate subject line
    const subject = this.generateSubject(semantic, diff, {
      type,
      scope,
      maxSubjectLength,
      language,
      style,
    });
    
    // Generate body if needed
    const body = this.generateBody(semantic, diff, {
      language,
      style,
      conventional,
    });
    
    // Generate footer
    const footer = this.generateFooter(semantic, diff, {
      style,
      conventional,
    });
    
    // Check for breaking changes
    const breaking = semantic.breakingSignals?.length > 0 || 
      this.checkBreaking(semantic, diff);
    
    // Extract breaking description if any
    const breakingDescription = breaking ? 
      this.generateBreakingDescription(semantic) : undefined;
    
    // Find issue references
    const issueReferences = this.extractIssueReferences(diff.rawDiff || '');
    
    // Extract co-authors
    const coAuthors = this.extractCoAuthors(diff.rawDiff || '');

    return {
      type,
      scope,
      subject,
      body: body || undefined,
      footer: footer || undefined,
      breaking,
      breakingDescription,
      issueReferences,
      coAuthors,
    };
  }

  /**
   * Determine the commit scope
   */
  private determineScope(
    semantic: SemanticAnalysis,
    diff: DiffResult,
    style: CommitStyle | null
  ): string | undefined {
    // Use suggested scope from semantic analysis
    const suggestedScope = semantic.suggestedScope;
    
    if (!suggestedScope) {
      return undefined;
    }

    // Normalize scope (lowercase, no special chars)
    const normalizedScope = suggestedScope
      .toLowerCase()
      .replace(/[^a-z0-9/]/g, '')
      .split('/')[0]; // Take first part

    // Check against style preferences
    if (style?.preferredScopes?.length) {
      if (style.preferredScopes.includes(normalizedScope)) {
        return normalizedScope;
      }
      // Fuzzy match
      for (const preferred of style.preferredScopes) {
        if (normalizedScope.includes(preferred) || preferred.includes(normalizedScope)) {
          return normalizedScope;
        }
      }
    }

    return normalizedScope;
  }

  /**
   * Generate the commit subject line
   */
  private generateSubject(
    semantic: SemanticAnalysis,
    diff: DiffResult,
    options: {
      type: ConventionalCommitType;
      scope?: string;
      maxSubjectLength: number;
      language: string;
      style?: CommitStyle | null;
    }
  ): string {
    const { type, scope, maxSubjectLength, language, style } = options;
    
    // Base verb/action based on type
    const actionVerbs: Record<ConventionalCommitType, Record<string, string>> = {
      'feat': { en: ['add', 'implement', 'introduce', 'create'] },
      'fix': { en: ['fix', 'resolve', 'repair', 'correct'] },
      'docs': { en: ['update', 'improve', 'add', 'document'] },
      'style': { en: ['improve', 'update', 'fix'] },
      'refactor': { en: ['refactor', 'restructure', 'improve'] },
      'perf': { en: ['improve', 'optimize', 'enhance', 'speed up'] },
      'test': { en: ['add', 'improve', 'update', 'expand'] },
      'build': { en: ['update', 'change', 'configure', 'setup'] },
      'ci': { en: ['update', 'improve', 'change', 'configure'] },
      'chore': { en: ['update', 'change', 'maintain', 'manage'] },
      'revert': { en: ['revert', 'undo', 'restore'] },
      'wip': { en: ['work on', 'start', 'begin', 'continue'] },
      'merge': { en: ['merge', 'combine', 'integrate'] },
    };

    // Get language-specific verb or default to English
    const verbs = actionVerbs[type]?.[language] || actionVerbs[type]?.['en'] || ['update'];
    const verb = verbs[0];

    // Extract change summary from features or files
    let changeSummary = '';
    
    if (semantic.extractedFeatures?.length > 0) {
      // Use extracted feature names
      const feature = semantic.extractedFeatures[0]
        .replace(/^(new |function |class |endpoint )/, '');
      changeSummary = feature;
    } else if (semantic.bugsFixed?.length > 0) {
      // Use bug description
      const bug = semantic.bugsFixed[0].replace(/^fixed /, '');
      changeSummary = bug;
    } else if (semantic.performanceChanges?.length > 0) {
      // Use performance description
      changeSummary = semantic.performanceChanges[0];
    } else {
      // Generate from affected areas
      const areas = semantic.affectedAreas?.slice(0, 2) || [];
      changeSummary = areas.join(' and ');
      
      if (!changeSummary) {
        // Fallback to changed files
        const fileNames = diff.files
          .slice(0, 2)
          .map(f => f.path.split('/').pop()?.replace(/\.[^.]+$/, '') || f.path);
        changeSummary = fileNames.join(', ');
      }
    }

    // Build subject
    let subject = `${verb} ${changeSummary}`;
    
    // Apply style patterns if available
    if (style?.commonPatterns?.length) {
      // Check if any pattern matches
      for (const pattern of style.commonPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(subject)) {
          // Pattern matched - use it
          break;
        }
      }
    }

    // Truncate if necessary
    if (subject.length > maxSubjectLength) {
      subject = subject.substring(0, maxSubjectLength - 3) + '...';
    }

    // Add imperative mood check
    subject = this.toImperativeMood(subject);

    return subject;
  }

  /**
   * Convert subject to imperative mood
   */
  private toImperativeMood(subject: string): string {
    const words = subject.split(' ');
    const firstWord = words[0].toLowerCase();
    
    // Common verb mappings to imperative
    const toImperative: Record<string, string> = {
      'adds': 'add',
      'adding': 'add',
      'added': 'add',
      'fixes': 'fix',
      'fixing': 'fix',
      'fixed': 'fix',
      'updates': 'update',
      'updating': 'update',
      'updated': 'update',
      'implements': 'implement',
      'implementing': 'implement',
      'implemented': 'implement',
      'creates': 'create',
      'creating': 'create',
      'created': 'create',
      'removes': 'remove',
      'removing': 'remove',
      'removed': 'remove',
      'fixes': 'fix',
    };

    if (toImperative[firstWord]) {
      words[0] = toImperative[firstWord];
    }

    return words.join(' ');
  }

  /**
   * Generate commit body
   */
  private generateBody(
    semantic: SemanticAnalysis,
    diff: DiffResult,
    options: {
      language: string;
      style?: CommitStyle | null;
      conventional: boolean;
    }
  ): string | null {
    const { language, style, conventional } = options;

    if (!conventional || !style?.useBody) {
      return null;
    }

    const lines: string[] = [];
    
    // Add detailed explanation if available
    if (semantic.keywords?.length > 0) {
      lines.push('This commit includes changes related to:');
      for (const keyword of semantic.keywords.slice(0, 5)) {
        lines.push(`- ${keyword}`);
      }
      lines.push('');
    }

    // Add specific changes
    if (semantic.extractedFeatures?.length > 0) {
      lines.push('Changes made:');
      for (const feature of semantic.extractedFeatures.slice(0, 3)) {
        lines.push(`- ${feature}`);
      }
      lines.push('');
    }

    // Add bug fixes
    if (semantic.bugsFixed?.length > 0) {
      lines.push('Bugs resolved:');
      for (const bug of semantic.bugsFixed.slice(0, 3)) {
        lines.push(`- ${bug}`);
      }
      lines.push('');
    }

    // Add performance notes
    if (semantic.performanceChanges?.length > 0) {
      lines.push('Performance improvements:');
      for (const perf of semantic.performanceChanges.slice(0, 3)) {
        lines.push(`- ${perf}`);
      }
      lines.push('');
    }

    return lines.length > 0 ? lines.join('\n').trim() : null;
  }

  /**
   * Generate commit footer
   */
  private generateFooter(
    semantic: SemanticAnalysis,
    diff: DiffResult,
    options: {
      style?: CommitStyle | null;
      conventional: boolean;
    }
  ): string | null {
    const { style, conventional } = options;

    if (!conventional) {
      return null;
    }

    const lines: string[] = [];
    
    // Add issue references
    const issueRefs = this.extractIssueReferences(diff.rawDiff || '');
    if (issueRefs.length > 0) {
      lines.push(`Refs: ${issueRefs.map(r => `#${r}`).join(', ')}`);
    }

    // Add breaking changes footer
    if (semantic.breakingSignals?.length > 0) {
      const breakingDesc = this.generateBreakingDescription(semantic);
      if (breakingDesc) {
        lines.push(`BREAKING CHANGE: ${breakingDesc}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  /**
   * Check for breaking changes
   */
  private checkBreaking(semantic: SemanticAnalysis, diff: DiffResult): boolean {
    // Check semantic signals
    if (semantic.breakingSignals?.some(s => s.confidence > 0.7)) {
      return true;
    }

    // Check diff for breaking indicators
    if (diff.rawDiff) {
      for (const indicator of BREAKING_INDICATORS) {
        if (diff.rawDiff.includes(indicator)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Generate breaking change description
   */
  private generateBreakingDescription(semantic: SemanticAnalysis): string {
    if (!semantic.breakingSignals?.length) {
      return 'This change introduces breaking changes that may require updates.';
    }

    const descriptions = semantic.breakingSignals.map(s => {
      return `${s.type}: ${s.description}`;
    });

    return descriptions.join('; ');
  }

  /**
   * Extract issue references from text
   */
  private extractIssueReferences(text: string): string[] {
    const refs = new Set<string>();

    for (const pattern of ISSUE_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        refs.add(match[1]);
      }
    }

    return Array.from(refs);
  }

  /**
   * Extract co-authors from text
   */
  private extractCoAuthors(text: string): string[] {
    const coAuthors: string[] = [];
    const coAuthorPattern = /co-authored-by:\s*(.+?)\s*<(.+?)>/gi;
    
    const matches = text.matchAll(coAuthorPattern);
    for (const match of matches) {
      coAuthors.push(`${match[1]} <${match[2]}>`);
    }

    return coAuthors;
  }

  /**
   * Format message as string
   */
  toString(message: ConventionalCommitMessage, includeEmoji: boolean = false): string {
    const parts: string[] = [];

    // Build type and scope
    let header = message.type;
    if (message.scope) {
      header += `(${message.scope})`;
    }
    
    // Add emoji if enabled
    if (includeEmoji && TYPE_EMOJI[message.type]) {
      header = `${TYPE_EMOJI[message.type]} ${header}`;
    }
    
    // Add breaking indicator
    if (message.breaking) {
      header += '!';
    }
    
    header += `: ${message.subject}`;
    parts.push(header);

    // Add body
    if (message.body) {
      parts.push('');
      parts.push(message.body);
    }

    // Add footer
    if (message.footer) {
      parts.push('');
      parts.push(message.footer);
    }

    return parts.join('\n');
  }

  /**
   * Parse a conventional commit message
   */
  parse(message: string): ConventionalCommitMessage | null {
    // Pattern for conventional commit header
    const headerPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
    const match = message.match(headerPattern);
    
    if (!match) {
      return null;
    }

    const [, type, scope, breaking, subject] = match;
    
    // Normalize type
    const normalizedType = TYPE_ALIASES[type.toLowerCase()] || type as ConventionalCommitType;

    // Split body and footer
    const sections = message.split(/\n\n/);
    let body: string | undefined;
    let footer: string | undefined;
    let breakingDescription: string | undefined;

    if (sections.length > 1) {
      body = sections[1];
    }
    if (sections.length > 2) {
      footer = sections.slice(2).join('\n\n');
    }

    // Check for breaking change in footer
    if (footer) {
      const breakingMatch = footer.match(/BREAKING\s+CHANGE:\s*(.+)/i);
      if (breakingMatch) {
        breakingDescription = breakingMatch[1];
      }
    }

    // Extract issue references
    const issueReferences = this.extractIssueReferences(message);

    return {
      type: normalizedType,
      scope: scope || undefined,
      subject: subject.trim(),
      body,
      footer,
      breaking: breaking === '!' || !!breakingDescription || message.includes('BREAKING'),
      breakingDescription,
      issueReferences,
      coAuthors: this.extractCoAuthors(message),
    };
  }

  /**
   * Validate a conventional commit message
   */
  validate(message: ConventionalCommitMessage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check type
    if (!message.type) {
      errors.push('Missing commit type');
    } else if (!Object.values(ConventionalCommitType).includes(message.type)) {
      errors.push(`Invalid commit type: ${message.type}`);
    }

    // Check subject
    if (!message.subject) {
      errors.push('Missing commit subject');
    } else {
      if (message.subject.length > this.defaultMaxSubjectLength) {
        errors.push(`Subject exceeds ${this.defaultMaxSubjectLength} characters`);
      }
      if (message.subject.endsWith('.')) {
        errors.push('Subject should not end with a period');
      }
      if (message.subject[0]?.toLowerCase() === message.subject[0]?.toUpperCase() && 
          !/^\d/.test(message.subject)) {
        errors.push('Subject should start with lowercase or number');
      }
    }

    // Check breaking format
    if (message.breaking && !message.breakingDescription && !message.footer?.includes('BREAKING')) {
      errors.push('Breaking change should include BREAKING CHANGE footer');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

type ConventionalCommitType = 
  | 'feat' | 'fix' | 'docs' | 'style' | 'refactor' 
  | 'perf' | 'test' | 'build' | 'ci' | 'chore' 
  | 'revert' | 'wip' | 'merge';
