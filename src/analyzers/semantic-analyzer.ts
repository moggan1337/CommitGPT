/**
 * Semantic Analyzer - Analyzes code changes to understand intent
 * 
 * Performs deep analysis of diffs to classify:
 * - Intent (feature, bugfix, refactor, etc.)
 * - Impact level
 * - Affected areas
 * - Complexity and risk
 */

import {
  DiffResult,
  DiffFile,
  SemanticAnalysis,
  CommitIntent,
  ImpactLevel,
  ComplexityLevel,
  RiskLevel,
  BreakingSignal,
} from '../core/types';

// Intent keywords and patterns
const INTENT_PATTERNS: Record<CommitIntent, {
  keywords: string[];
  filePatterns: RegExp[];
  changeIndicators: string[];
}> = {
  feature: {
    keywords: ['add', 'implement', 'new', 'create', 'introduce', 'enhance', 'extend'],
    filePatterns: [/src\/features?/, /\/new\//, /\/v\d+\//],
    changeIndicators: ['new function', 'new component', 'new module', 'new endpoint'],
  },
  bugfix: {
    keywords: ['fix', 'fixes', 'fixed', 'bug', 'patch', 'resolve', 'correct', 'repair'],
    filePatterns: [/bug|fix/i, /error|exception/i, /crash/i],
    changeIndicators: ['null check', 'error handling', 'try-catch', 'undefined'],
  },
  refactoring: {
    keywords: ['refactor', 'restructure', 'reorganize', 'cleanup', 'simplify', 'extract'],
    filePatterns: [/refactor/i, /restructure/i],
    changeIndicators: ['rename', 'move', 'extract method', 'inline', 'replace'],
  },
  documentation: {
    keywords: ['docs?', 'document', 'readme', 'comment', 'api', 'guide', 'tutorial'],
    filePatterns: [/\.md$/, /docs?/, /readme/i, /changelog/i, /comments?/],
    changeIndicators: [],
  },
  optimization: {
    keywords: ['optimize', 'perf', 'performance', 'speed', 'efficient', 'fast', 'cache'],
    filePatterns: [/perf|optimize/i, /cache/i],
    changeIndicators: ['O(n)', 'algorithm', 'complexity', 'loop', 'query'],
  },
  testing: {
    keywords: ['test', 'spec', 'coverage', 'unit', 'integration', 'e2e'],
    filePatterns: [/test|spec|__tests?__/, /\.test\./, /\.spec\./, /test/i],
    changeIndicators: ['describe', 'it(', 'expect', 'assert'],
  },
  configuration: {
    keywords: ['config', 'settings', 'env', 'setup', 'initialize'],
    filePatterns: [/\.config\./, /config\//, /settings/, /\.env/, /webpack/i, /babel/i],
    changeIndicators: [],
  },
  dependency: {
    keywords: ['update', 'upgrade', 'add', 'remove', 'dependency', 'package', 'npm'],
    filePatterns: [/package\.json/, /package-lock\.json/, /yarn\.lock/, /requirements\.txt/],
    changeIndicators: ['@types/', 'peerDependencies', 'devDependencies'],
  },
  security: {
    keywords: ['security', 'vulnerability', 'auth', 'sanitize', 'escape', 'protect'],
    filePatterns: [/security|auth|login|password/i],
    changeIndicators: ['SQL injection', 'XSS', 'CSRF', 'sanitize', 'validate'],
  },
  localization: {
    keywords: ['i18n', 'locale', 'translate', 'language', 'l10n', 'translation'],
    filePatterns: [/i18n|l10n|locale|translations?/i, /\.json$/],
    changeIndicators: [],
  },
  formatting: {
    keywords: ['format', 'lint', 'style', 'prettier', 'eslint', 'indent'],
    filePatterns: [/\.prettierrc/, /\.eslintrc/, /\.editorconfig/],
    changeIndicators: ['formatting', 'whitespace', 'line endings'],
  },
  cleanup: {
    keywords: ['cleanup', 'remove', 'delete', 'unused', 'deprecated', 'dead code'],
    filePatterns: [],
    changeIndicators: ['unused', 'remove', 'delete', 'deprecated'],
  },
  revert: {
    keywords: ['revert', 'undo', 'back', 'restore', 'rollback'],
    filePatterns: [],
    changeIndicators: [],
  },
  merge: {
    keywords: ['merge', 'pull', 'combine', 'branch'],
    filePatterns: [],
    changeIndicators: ['<<<<<<<', '=======', '>>>>>>>'],
  },
  unknown: {
    keywords: [],
    filePatterns: [],
    changeIndicators: [],
  },
};

// Impact keywords
const IMPACT_KEYWORDS = {
  critical: ['critical', 'breaking', 'major', 'security', 'vulnerability', 'data loss'],
  major: ['new feature', 'significant', 'important', 'redesign', 'rebuild'],
  minor: ['small', 'minor', 'tiny', 'trivial', 'cosmetic'],
  trivial: ['fix typo', 'formatting', 'whitespace', 'comment'],
};

/**
 * Semantic Analyzer Class
 */
export class SemanticAnalyzer {
  /**
   * Analyze a diff result to understand the semantic meaning
   */
  async analyze(diff: DiffResult): Promise<SemanticAnalysis> {
    // Determine primary intent
    const intent = this.classifyIntent(diff);
    
    // Calculate impact level
    const impact = this.calculateImpact(diff, intent);
    
    // Find affected areas
    const affectedAreas = this.identifyAffectedAreas(diff);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(diff);
    
    // Calculate risk level
    const risk = this.calculateRisk(diff, intent);
    
    // Suggest scope
    const suggestedScope = this.suggestScope(diff, intent);
    
    // Extract keywords
    const keywords = this.extractKeywords(diff);
    
    // Extract features
    const extractedFeatures = this.extractFeatures(diff);
    
    // Find bugs fixed
    const bugsFixed = this.extractBugsFixed(diff);
    
    // Find performance changes
    const performanceChanges = this.extractPerformanceChanges(diff);
    
    // Detect breaking signals
    const breakingSignals = this.detectBreakingSignals(diff);

    return {
      intent,
      impact,
      affectedAreas,
      complexity,
      riskLevel: risk,
      suggestedScope,
      keywords,
      extractedFeatures,
      bugsFixed,
      performanceChanges,
      breakingSignals,
    };
  }

  /**
   * Classify the primary intent of the changes
   */
  private classifyIntent(diff: DiffResult): CommitIntent {
    const scores: Record<CommitIntent, number> = {
      feature: 0, bugfix: 0, refactoring: 0, documentation: 0,
      optimization: 0, testing: 0, configuration: 0, dependency: 0,
      security: 0, localization: 0, formatting: 0, cleanup: 0,
      revert: 0, merge: 0, unknown: 0,
    };

    // Check each file for intent indicators
    for (const file of diff.files) {
      // Check file path patterns
      for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of patterns.filePatterns) {
          if (pattern.test(file.path)) {
            scores[intent as CommitIntent] += 3;
          }
        }
      }

      // Check file content changes
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          const content = line.content.toLowerCase();
          
          for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
            for (const keyword of patterns.keywords) {
              if (content.includes(keyword)) {
                scores[intent as CommitIntent] += 1;
              }
            }
          }
        }
      }
    }

    // Add penalties for mixed intents
    const intentCounts = Object.entries(scores).filter(([k]) => k !== 'unknown');
    const maxScore = Math.max(...intentCounts.map(([, v]) => v));
    const maxIntents = intentCounts.filter(([, v]) => v === maxScore);
    
    // If multiple intents have similar scores, might be mixed
    if (maxIntents.length > 1 && maxScore > 0) {
      // Return the most significant intent
      const intentPriority: CommitIntent[] = [
        'security', 'bugfix', 'feature', 'refactoring', 
        'configuration', 'dependency', 'testing', 'documentation',
        'optimization', 'cleanup', 'formatting', 'localization',
        'revert', 'merge', 'unknown'
      ];
      
      for (const intent of intentPriority) {
        if (maxIntents.some(([k]) => k === intent)) {
          return intent;
        }
      }
    }

    // Find the intent with highest score
    const sortedIntents = intentCounts.sort((a, b) => b[1] - a[1]);
    
    if (sortedIntents[0][1] === 0) {
      return 'unknown';
    }

    return sortedIntents[0][0] as CommitIntent;
  }

  /**
   * Calculate the impact level of changes
   */
  private calculateImpact(diff: DiffResult, intent: CommitIntent): ImpactLevel {
    let impactScore = 0;

    // File count impact
    if (diff.totalFiles >= 20) impactScore += 3;
    else if (diff.totalFiles >= 10) impactScore += 2;
    else if (diff.totalFiles >= 5) impactScore += 1;

    // Line change impact
    const totalChanges = diff.totalAdditions + diff.totalDeletions;
    if (totalChanges >= 500) impactScore += 3;
    else if (totalChanges >= 200) impactScore += 2;
    else if (totalChanges >= 50) impactScore += 1;

    // Check for critical keywords
    for (const keyword of IMPACT_KEYWORDS.critical) {
      if (diff.rawDiff?.toLowerCase().includes(keyword)) {
        impactScore += 3;
        break;
      }
    }

    // Security-related files are high impact
    for (const file of diff.files) {
      if (/\/(security|auth|permission)/i.test(file.path)) {
        impactScore += 2;
      }
      // Core files are high impact
      if (/src\/index\.|src\/main\./.test(file.path)) {
        impactScore += 1;
      }
    }

    // Intent-based adjustments
    if (intent === 'security' || intent === 'bugfix') {
      impactScore += 2;
    } else if (intent === 'documentation' || intent === 'formatting') {
      impactScore -= 1;
    }

    // Determine level
    if (impactScore >= 6) return 'critical';
    if (impactScore >= 4) return 'major';
    if (impactScore >= 2) return 'minor';
    return 'trivial';
  }

  /**
   * Identify affected areas/modules
   */
  private identifyAffectedAreas(diff: DiffResult): string[] {
    const areas = new Set<string>();

    for (const file of diff.files) {
      // Extract module from path
      const parts = file.path.split('/');
      
      // Common patterns for modules
      if (parts[0] === 'src' || parts[0] === 'lib') {
        if (parts.length > 1) {
          areas.add(parts[1]);
        }
      } else if (parts[0] === 'packages') {
        if (parts.length > 1) {
          areas.add(`packages/${parts[1]}`);
        }
      } else if (file.path.includes('/components/')) {
        const match = file.path.match(/\/components\/([^/]+)/);
        if (match) areas.add(`components/${match[1]}`);
      } else if (file.path.includes('/pages/')) {
        const match = file.path.match(/\/pages\/([^/]+)/);
        if (match) areas.add(`pages/${match[1]}`);
      } else if (file.path.includes('/routes/')) {
        areas.add('routing');
      } else if (file.path.includes('/utils/') || file.path.includes('/helpers/')) {
        areas.add('utilities');
      } else if (file.path.includes('/services/')) {
        areas.add('services');
      } else if (file.path.includes('/api/')) {
        areas.add('api');
      } else if (file.path.includes('/db/') || file.path.includes('/database/')) {
        areas.add('database');
      } else {
        // Use top-level directory as area
        areas.add(parts[0] || 'root');
      }
    }

    return Array.from(areas);
  }

  /**
   * Calculate code complexity
   */
  private calculateComplexity(diff: DiffResult): ComplexityLevel {
    let complexityScore = 0;

    for (const file of diff.files) {
      // Binary files are complex
      if (file.status === 'added' && file.path.match(/\.(png|jpg|pdf|exe|dll)$/)) {
        complexityScore += 2;
      }

      // Large diffs are complex
      if (file.additions > 100 || file.deletions > 100) {
        complexityScore += 2;
      } else if (file.additions > 50 || file.deletions > 50) {
        complexityScore += 1;
      }

      // Many hunks indicate complex changes
      if (file.hunks.length > 5) {
        complexityScore += 1;
      }
    }

    // Many files indicate complex changes
    if (diff.totalFiles > 15) {
      complexityScore += 2;
    } else if (diff.totalFiles > 8) {
      complexityScore += 1;
    }

    if (complexityScore >= 5) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * Calculate risk level
   */
  private calculateRisk(diff: DiffResult, intent: CommitIntent): RiskLevel {
    let riskScore = 0;

    // High-risk file types
    const highRiskPatterns = [
      /database|migration|schema/i,
      /auth|security|permission/i,
      /payment|billing|subscription/i,
      /core|main|index\./i,
      /\.env\.|\.env\./i,
    ];

    for (const file of diff.files) {
      for (const pattern of highRiskPatterns) {
        if (pattern.test(file.path)) {
          riskScore += 2;
        }
      }
    }

    // Intent-based risk
    if (intent === 'security') riskScore += 3;
    if (intent === 'bugfix') riskScore += 1;
    if (intent === 'documentation' || intent === 'formatting') riskScore -= 2;

    if (riskScore >= 4) return 'high';
    if (riskScore >= 1) return 'medium';
    return 'low';
  }

  /**
   * Suggest a scope based on changes
   */
  private suggestScope(diff: DiffResult, intent: CommitIntent): string {
    // For configuration/dependency changes
    if (diff.files.some(f => /package\.json$/.test(f.path))) {
      return 'deps';
    }
    
    // For documentation
    if (diff.files.every(f => f.isDocs)) {
      return 'docs';
    }

    // For tests only
    if (diff.files.every(f => f.isTest)) {
      return 'tests';
    }

    // Find common module
    const modules = diff.files
      .map(f => {
        const parts = f.path.split('/');
        if (parts[0] === 'src' || parts[0] === 'lib') {
          return parts.slice(0, 2).join('/');
        }
        return parts[0];
      })
      .filter(m => m && !['tests', 'test', '__tests__', 'docs'].includes(m));

    if (modules.length === 0) {
      return intent === 'configuration' ? 'config' : 'core';
    }

    // Return most common module
    const counts = modules.reduce((acc, m) => {
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Extract keywords from changes
   */
  private extractKeywords(diff: DiffResult): string[] {
    const keywords: string[] = [];
    const seen = new Set<string>();

    for (const file of diff.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add') {
            const content = line.content.toLowerCase();
            
            // Extract meaningful identifiers
            const words = content.match(/[a-z][a-z0-9]{2,}/g) || [];
            for (const word of words) {
              if (!seen.has(word) && word.length > 3) {
                seen.add(word);
                keywords.push(word);
              }
            }
          }
        }
      }
    }

    return keywords.slice(0, 20);
  }

  /**
   * Extract new features/functionality
   */
  private extractFeatures(diff: DiffResult): string[] {
    const features: string[] = [];

    for (const file of diff.files) {
      if (file.status === 'added') {
        // New files might indicate new features
        const name = file.path.split('/').pop() || '';
        features.push(`new ${name.replace(/\.[^.]+$/, '')}`);
      }

      // Check for new function/class definitions
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'add') {
            const content = line.content;
            
            // Class definitions
            const classMatch = content.match(/class\s+(\w+)/);
            if (classMatch) {
              features.push(`class ${classMatch[1]}`);
            }

            // Function definitions
            const funcMatch = content.match(/(?:function|const|let|var)\s+(\w+)\s*=.*=>/);
            if (funcMatch) {
              features.push(`function ${funcMatch[1]}`);
            }

            // API endpoints
            const endpointMatch = content.match(/['"](\/(?:api|v\d+)\/[^'"]+)['"]/);
            if (endpointMatch) {
              features.push(`endpoint ${endpointMatch[1]}`);
            }
          }
        }
      }
    }

    return [...new Set(features)];
  }

  /**
   * Extract bugs that were fixed
   */
  private extractBugsFixed(diff: DiffResult): string[] {
    const bugs: string[] = [];

    for (const file of diff.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type === 'delete') {
            const content = line.content.toLowerCase();
            
            // Look for bug-related patterns in removed code
            if (/throw\s+new\s+error/i.test(content)) {
              bugs.push('removed error throw');
            }
            if (/return\s+null|return\s+undefined/i.test(content)) {
              bugs.push('fixed null/undefined return');
            }
          }
          if (line.type === 'add') {
            const content = line.content;
            
            // Error handling additions
            if (/catch\s*\([^)]*\)\s*{/.test(content)) {
              bugs.push('added error handling');
            }
            if (/if\s*\([^)]*!==?\s*(null|undefined)/.test(content)) {
              bugs.push('added null check');
            }
            if (/if\s*\([^)]*===\s*undefined/.test(content)) {
              bugs.push('added undefined check');
            }
          }
        }
      }
    }

    return [...new Set(bugs)];
  }

  /**
   * Extract performance-related changes
   */
  private extractPerformanceChanges(diff: DiffResult): string[] {
    const changes: string[] = [];

    for (const file of diff.files) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          const content = line.content.toLowerCase();
          
          // Caching
          if (line.type === 'add' && /cache|memoize|lru/.test(content)) {
            changes.push('added caching');
          }
          
          // Index/database
          if (/index|key/.test(content) && /create|add/.test(content)) {
            changes.push('added index');
          }
          
          // Lazy loading
          if (/lazy|dynamic|import\(/.test(content)) {
            changes.push('added lazy loading');
          }
          
          // Pagination
          if (/limit|offset|page|skip|take/.test(content)) {
            changes.push('added pagination');
          }
        }
      }
    }

    return [...new Set(changes)];
  }

  /**
   * Detect breaking change signals
   */
  private detectBreakingSignals(diff: DiffResult): BreakingSignal[] {
    const signals: BreakingSignal[] = [];

    for (const file of diff.files) {
      // API changes
      if (/\/api\//.test(file.path) || /\/routes?\/|\/endpoints?/i.test(file.path)) {
        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'delete') {
              // Removed endpoints
              if (/^-\s*(get|post|put|patch|delete)\s+['"]/.test(line.content)) {
                signals.push({
                  type: 'api-removal',
                  description: 'Removed API endpoint',
                  location: file.path,
                  confidence: 0.9,
                });
              }
              // Removed parameters
              if (/^-\s*\w+\s*[:=]/.test(line.content)) {
                signals.push({
                  type: 'api-change',
                  description: 'Removed API parameter',
                  location: file.path,
                  confidence: 0.7,
                });
              }
            }
          }
        }
      }

      // Config changes
      if (/\.env|\.config\./.test(file.path)) {
        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            if (line.type === 'delete' && /^-\s*\w+=/.test(line.content)) {
              signals.push({
                type: 'env-change',
                description: 'Removed environment variable',
                location: file.path,
                confidence: 0.8,
              });
            }
          }
        }
      }

      // Package changes
      if (/package\.json$/.test(file.path)) {
        for (const hunk of file.hunks) {
          for (const line of hunk.lines) {
            // Version bumps for major versions
            const majorBump = line.content.match(/"\^?(\d+)\.\d+\.\d+"/);
            if (majorBump && parseInt(majorBump[1]) > 0 && line.type === 'add') {
              signals.push({
                type: 'dependency-upgrade',
                description: 'Major version dependency upgrade',
                location: file.path,
                confidence: 0.9,
              });
            }
          }
        }
      }
    }

    return signals;
  }
}
