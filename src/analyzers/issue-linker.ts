/**
 * Issue Linker
 * 
 * Finds and links issues, pull requests, and commits referenced in:
 * - Commit messages
 * - Code comments
 * - Pull request descriptions
 * - Branch names
 */

import { IssueReference } from '../core/types';

// Issue/PR reference patterns
const REFERENCE_PATTERNS = {
  // GitHub issues and PRs
  github: {
    issue: /(?:(?:(?:#)|(?:gh[-_]?)|(?:github[-_]?))(\d+))/gi,
    pr: /(?:(?:pr[#:]?\s*)|(?:pull[-_]?request[#:]?\s*)|(?:#)\d+(?:\s*(?:closes?|fixes?|resolves?)))/gi,
    fullUrl: /https?:\/\/github\.com\/[\w-]+\/[\w.-]+\/(?:issues|pull)\/(\d+)/gi,
  },
  
  // GitLab issues and MRs
  gitlab: {
    issue: /(?:(?:(?:!)|(?:gitlab[-_]?))(\d+))/gi,
    mr: /(?:(?:mr[#:]?\s*)|(?:merge[-_]?request[#:]?\s*)|(?:!)\d+(?:\s*(?:closes?|fixes?|resolves?)))/gi,
    fullUrl: /https?:\/\/gitlab\.com\/[\w-]+\/[\w.-]+\/(?:issues|merge_requests)\/(\d+)/gi,
  },
  
  // Jira issues
  jira: {
    issue: /([A-Z]+-\d+)/gi,
    fullUrl: /https?:\/\/[\w.-]+\.atlassian\.net\/browse\/([A-Z]+-\d+)/gi,
  },
  
  // Linear issues
  linear: {
    issue: /(?:linear[-_:]?\s*)?([A-Z]+-\d+)/gi,
    fullUrl: /https?:\/\/linear\.app\/[\w.-]+\/issue\/([A-Z]+-\d+)/gi,
  },
  
  // Bitbucket issues
  bitbucket: {
    issue: /(?:(?:#)|(?:bb[-_]?))(\d+)/gi,
    fullUrl: /https?:\/\/bitbucket\.org\/[\w-]+\/[\w.-]+\/issues\/(\d+)/gi,
  },
  
  // Generic patterns
  generic: {
    issue: /(?:(?:issues?[-:_]?\s*)|(?:(?:closes?|fixes?|resolves?)\s*(?:#|no\.?)\s*))(\d+)/gi,
    ticket: /(?:(?:ticket[-:_]?\s*)|(?:(?:closes?|fixes?|resolves?)\s*ticket\s*))(\d+)/gi,
  },
};

// Keywords that link issues to commits
const LINK_KEYWORDS = [
  'close', 'closes', 'closed',
  'fix', 'fixes', 'fixed',
  'resolve', 'resolves', 'resolved',
  'implement', 'implements', 'implemented',
  'ref', 'refs', 'reference',
  'see', 'see also',
  're', 'regarding',
  'part of', 'partial',
  'continues', 'continue',
  'related', 'relates',
];

// Link action patterns
const ACTION_PATTERNS = [
  /(?:closes?|fixes?|resolves?)\s*(?:(?:@|#|no\.?\s*)?(\d+))/gi,
  /(?:implements?|references?)\s*(?:(?:@|#|no\.?\s*)?(\d+))/gi,
  /#(\d+)/g,
];

export class IssueLinker {
  private patterns: string[];
  private customPatterns: Map<RegExp, string>;

  constructor(issuePatterns: string[] = []) {
    this.patterns = issuePatterns;
    this.customPatterns = new Map();
    
    // Add custom patterns
    for (const pattern of issuePatterns) {
      try {
        this.customPatterns.set(new RegExp(pattern, 'gi'), 'custom');
      } catch {
        // Invalid regex, skip
      }
    }
  }

  /**
   * Find all issue/PR references in text
   */
  findReferences(text: string): IssueReference[] {
    const refs: IssueReference[] = [];

    // Search with all patterns
    for (const [platform, platformPatterns] of Object.entries(REFERENCE_PATTERNS)) {
      for (const [, pattern] of Object.entries(platformPatterns)) {
        const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
        for (const match of matches) {
          const ref = this.createReference(match, platform);
          if (ref && !refs.some(r => r.id === ref.id && r.type === ref.type)) {
            refs.push(ref);
          }
        }
      }
    }

    // Search with custom patterns
    for (const [pattern] of this.customPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ref = this.createReference(match, 'custom');
        if (ref && !refs.some(r => r.id === ref.id && r.type === ref.type)) {
          refs.push(ref);
        }
      }
    }

    // Determine link action (closes, fixes, etc.)
    for (const ref of refs) {
      ref.action = this.determineAction(text, ref.id);
    }

    return refs;
  }

  /**
   * Create issue reference from match
   */
  private createReference(match: RegExpMatchArray, platform: string): IssueReference | null {
    // Get the captured group
    const id = match[1] || match[0];
    
    if (!id || id.length === 0) {
      return null;
    }

    // Determine type
    let type: 'issue' | 'pull-request' | 'commit' = 'issue';
    
    if (match[0].toLowerCase().includes('pr') || 
        match[0].toLowerCase().includes('pull-request') ||
        match[0].toLowerCase().includes('merge-request') ||
        match[0].toLowerCase().includes('!')) {
      type = 'pull-request';
    }

    // Build URL if full URL was matched
    let url: string | undefined;
    if (match[0].startsWith('http')) {
      url = match[0];
    } else if (platform === 'github') {
      url = `https://github.com/OWNER/REPO/issues/${id}`;
    } else if (platform === 'gitlab') {
      url = `https://gitlab.com/OWNER/REPO/-/issues/${id}`;
    } else if (platform === 'jira' || platform === 'linear') {
      url = id; // Already have full ID
    }

    return {
      type,
      id: id.trim(),
      url,
      confidence: this.calculateConfidence(match[0], platform),
    };
  }

  /**
   * Calculate confidence score for reference
   */
  private calculateConfidence(match: string, platform: string): number {
    let confidence = 0.5;

    // Higher confidence for full URLs
    if (match.startsWith('http')) {
      confidence += 0.3;
    }

    // Higher confidence for platform-specific patterns
    if (platform === 'github' && match.startsWith('#')) {
      confidence += 0.2;
    }
    if (platform === 'gitlab' && match.startsWith('!')) {
      confidence += 0.2;
    }
    if (platform === 'jira' && /^[A-Z]+-\d+$/.test(match)) {
      confidence += 0.3;
    }

    // Higher confidence for action keywords
    for (const keyword of LINK_KEYWORDS) {
      if (match.toLowerCase().includes(keyword)) {
        confidence += 0.1;
        break;
      }
    }

    return Math.min(confidence, 1);
  }

  /**
   * Determine action type for reference
   */
  private determineAction(text: string, issueId: string): string | undefined {
    const lowerText = text.toLowerCase();
    
    for (const keyword of LINK_KEYWORDS) {
      const pattern = new RegExp(`${keyword}\\s*(?:@|#|no\\.?)?${issueId}`, 'i');
      if (pattern.test(text)) {
        return keyword;
      }
    }

    return undefined;
  }

  /**
   * Link issues to branch name
   */
  extractFromBranch(branchName: string): IssueReference[] {
    const refs: IssueReference[] = [];

    // Common branch name patterns
    const branchPatterns = [
      /^(?:feature|fix|bugfix|hotfix|chore|refactor|docs)\/([\w-]+)(?:\/(\d+))?/i,
      /^(?:feat|fix|bug|chore)\/(\d+)/i,
      /^(\d+)(?:\/|$)/,
      /([A-Z]+-\d+)/gi,
    ];

    for (const pattern of branchPatterns) {
      const matches = branchName.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const id = match[2] || match[1];
        if (id && /^\d+$/.test(id) || /^[A-Z]+-\d+$/.test(id)) {
          refs.push({
            type: 'issue',
            id,
            confidence: 0.6,
          });
        }
      }
    }

    return refs;
  }

  /**
   * Generate footer for commit message
   */
  generateFooter(refs: IssueReference[], action: string = 'Closes'): string {
    if (refs.length === 0) {
      return '';
    }

    const lines: string[] = [];
    
    // Group by type
    const issues = refs.filter(r => r.type === 'issue');
    const prs = refs.filter(r => r.type === 'pull-request');

    if (issues.length > 0) {
      if (issues.length === 1) {
        lines.push(`${action} #${issues[0].id}`);
      } else {
        const ids = issues.map(i => i.id).join(', ');
        lines.push(`${action}s #${ids}`);
      }
    }

    if (prs.length > 0) {
      if (prs.length === 1) {
        lines.push(`Closes #${prs[0].id}`);
      } else {
        const ids = prs.map(p => p.id).join(', ');
        lines.push(`Closes #${ids}`);
      }
    }

    // Add refs
    const refIssues = refs.filter(r => r.action === 'ref' || r.action === 'references');
    if (refIssues.length > 0) {
      const ids = refIssues.map(i => i.id).join(', ');
      lines.push(`Refs #${ids}`);
    }

    return lines.join('\n');
  }

  /**
   * Validate issue reference format
   */
  validateReference(id: string, platform?: string): boolean {
    // Numeric ID (GitHub, GitLab, etc.)
    if (/^\d+$/.test(id)) {
      return true;
    }

    // Jira-style
    if (/^[A-Z]+-\d+$/.test(id)) {
      return true;
    }

    // Linear-style
    if (/^[a-z]+-[a-z0-9]+$/i.test(id)) {
      return true;
    }

    return false;
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: string, type: string = 'custom'): boolean {
    try {
      const regex = new RegExp(pattern, 'gi');
      this.customPatterns.set(regex, type);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove custom pattern
   */
  removePattern(pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'gi');
      return this.customPatterns.delete(regex);
    } catch {
      return false;
    }
  }
}

// Extend IssueReference type
declare module '../core/types' {
  interface IssueReference {
    action?: string;
  }
}
