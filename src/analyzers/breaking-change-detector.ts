/**
 * Breaking Change Detector
 * 
 * Analyzes code changes to detect potential breaking changes that could
 * affect consumers of the API, library, or application.
 */

import { DiffResult, BreakingSignal, BreakingSignalType } from '../core/types';

// Patterns that indicate breaking changes
const BREAKING_PATTERNS = {
  // API/Endpoint removal or modification
  apiEndpoint: {
    patterns: [
      /^\s*(DELETE|REMOVED?)\s+['"](\/api|\/v\d+\/)/m,
      /^\s*-(?:get|post|put|patch|delete|options|head)\s+['"]/m,
      /router\.(?:delete|remove)\s*\(/,
      /@DeleteMapping|@Delete\(|@HttpMethod\.DELETE/,
      /router\.delete|app\.delete|router\.remove/,
    ],
    type: 'api-removal' as BreakingSignalType,
    confidence: 0.9,
  },
  
  // API parameter/interface change
  apiChange: {
    patterns: [
      /^\s*-\s*\w+\s*[:=]\s*\w+/m,
      /interface\s+\w+\s*{[^}]*-\s*\w+/,
      /type\s+\w+\s*=[^;]+-\s*\w+/,
      /class\s+\w+[^}]*-\s*\w+/,
      /@Required|@NonNull|nullable:\s*false/,
      /required:\s*true/,
    ],
    type: 'api-change' as BreakingSignalType,
    confidence: 0.8,
  },
  
  // Configuration removal
  configRemoval: {
    patterns: [
      /^\s*-\s*\w+\s*=\s*['"`]/m,
      /^\s*-\s*\w+:\s*['"`]/m,
      /remove.*config|delete.*setting|unset.*env/i,
      /process\.env\.\w+\s*$/m,
    ],
    type: 'config-removal' as BreakingSignalType,
    confidence: 0.85,
  },
  
  // Major version dependency upgrade
  dependencyUpgrade: {
    patterns: [
      /"(\w+)":\s*"\^?([1-9]\d+)/,
      /(\w+)@\^?([1-9]\d+)\.\d+\.\d+/,
      /peerDependencies.*major/i,
      /BREAKING.*CHANGES?:/i,
    ],
    type: 'dependency-upgrade' as BreakingSignalType,
    confidence: 0.95,
  },
  
  // Database schema changes
  schemaChange: {
    patterns: [
      /ALTER\s+TABLE|DROP\s+TABLE|CREATE\s+TABLE.*CHANGE/i,
      /migration.*down|db:migrate.*rollback/i,
      /\$push\s*:\s*\$pull/,
      /schema\.remove|schema\.drop/i,
      /Model\.remove|Model\.delete/,
    ],
    type: 'schema-change' as BreakingSignalType,
    confidence: 0.9,
  },
  
  // Environment variable changes
  envChange: {
    patterns: [
      /^\s*-\s*\w+\s*=\s*\S/m,
      /process\.env\.\w+\s*$/m,
      /\b(env|ENV)\b.*-.*\w+/,
      /config.*remove|settings.*remove/i,
    ],
    type: 'env-change' as BreakingSignalType,
    confidence: 0.85,
  },
  
  // Permission/access control changes
  permissionChange: {
    patterns: [
      /@Roles|@Permissions|@Authorize/i,
      /isAdmin|isOwner|hasPermission/i,
      /access.*control|permission.*denied|unauthorized/i,
      /CORS|cors\.Origins/,
    ],
    type: 'permission-change' as BreakingSignalType,
    confidence: 0.75,
  },
  
  // Behavioral changes
  behavioralChange: {
    patterns: [
      /throw\s+new\s+Error/i,
      /return\s*(null|undefined|false)/,
      /console\.(warn|error)/,
      /process\.exit|process\.abort/,
      /setTimeout.*0|setImmediate/,
    ],
    type: 'behavioral-change' as BreakingSignalType,
    confidence: 0.7,
  },
};

// Breaking change keywords
const BREAKING_KEYWORDS = [
  'BREAKING',
  'BREAKING-CHANGE',
  'BREAKING CHANGE',
  '!',
  'MAJOR',
  'DROPPED',
  'REMOVED',
  'DEPRECATED',
  'BC BREAK',
];

// File patterns associated with breaking changes
const BREAKING_FILE_PATTERNS = [
  /package\.json$/,
  /composer\.json$/,
  /requirements\.txt$/,
  /Cargo\.toml$/,
  /go\.mod$/,
  /\.env\./,
  /\.config\./,
  /migration/,
  /schema/,
  /api/,
  /routes?/,
  /endpoints?/,
  /middleware/,
  /auth/,
  /permission/,
  /swagger/,
  /openapi/,
  /CHANGELOG/,
];

export class BreakingChangeDetector {
  /**
   * Detect breaking changes in a diff
   */
  detect(diff: DiffResult): BreakingSignal[] {
    const signals: BreakingSignal[] = [];

    // Check for explicit breaking indicators
    if (diff.rawDiff) {
      for (const keyword of BREAKING_KEYWORDS) {
        if (diff.rawDiff.includes(keyword)) {
          signals.push({
            type: 'behavioral-change',
            description: `Found explicit breaking change indicator: ${keyword}`,
            confidence: 1.0,
          });
          break;
        }
      }
    }

    // Analyze each file
    for (const file of diff.files) {
      // Skip test files for breaking change detection
      if (file.isTest) continue;

      // Check file path for breaking potential
      const pathSignals = this.analyzeFilePath(file.path, diff.rawDiff || '');
      signals.push(...pathSignals);

      // Analyze content changes
      const contentSignals = this.analyzeFileChanges(file);
      signals.push(...contentSignals);
    }

    // Deduplicate and merge similar signals
    return this.mergeSignals(signals);
  }

  /**
   * Analyze file path for breaking change indicators
   */
  private analyzeFilePath(
    filePath: string,
    rawDiff: string
  ): BreakingSignal[] {
    const signals: BreakingSignal[] = [];

    // Check against breaking file patterns
    for (const pattern of BREAKING_FILE_PATTERNS) {
      if (pattern.test(filePath)) {
        signals.push({
          type: this.getSignalTypeForPattern(pattern),
          description: `Changes to ${this.getFileCategory(pattern)} file: ${filePath}`,
          location: filePath,
          confidence: 0.7,
        });
      }
    }

    // Check for removal of files
    if (rawDiff.includes(`deleted file mode`) || 
        rawDiff.includes(`-new file:`)) {
      signals.push({
        type: 'api-removal',
        description: `File removed: ${filePath}`,
        location: filePath,
        confidence: 0.85,
      });
    }

    return signals;
  }

  /**
   * Analyze file changes for breaking patterns
   */
  private analyzeFileChanges(file: DiffResult['files'][0]): BreakingSignal[] {
    const signals: BreakingSignal[] = [];

    // Only analyze deleted and modified files
    if (file.status === 'added') {
      // New files are less likely to be breaking
      return signals;
    }

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        // Only check deletions and context for patterns
        if (line.type === 'delete' || line.type === 'context') {
          const content = line.content;
          
          for (const [category, config] of Object.entries(BREAKING_PATTERNS)) {
            for (const pattern of config.patterns) {
              if (pattern.test(content)) {
                signals.push({
                  type: config.type,
                  description: this.generateDescription(category, content),
                  location: file.path,
                  confidence: config.confidence,
                });
              }
            }
          }
        }
      }
    }

    return signals;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(category: string, content: string): string {
    const descriptions: Record<string, string> = {
      apiEndpoint: `Removed or modified API endpoint: ${content.substring(0, 50)}...`,
      apiChange: `Modified API interface: ${content.substring(0, 50)}...`,
      configRemoval: `Removed configuration: ${content.substring(0, 50)}...`,
      dependencyUpgrade: `Upgraded major dependency version`,
      schemaChange: `Modified database schema`,
      envChange: `Removed environment variable`,
      permissionChange: `Changed permission or access control`,
      behavioralChange: `Changed behavior or error handling`,
    };

    return descriptions[category] || `Potential breaking change: ${content.substring(0, 50)}...`;
  }

  /**
   * Get signal type for file pattern
   */
  private getSignalTypeForPattern(pattern: RegExp): BreakingSignalType {
    if (/package|composer|requirements|Cargo|go\.mod/.test(pattern.source)) {
      return 'dependency-upgrade';
    }
    if (/\.env|\.config/.test(pattern.source)) {
      return 'config-removal';
    }
    if (/migration|schema/.test(pattern.source)) {
      return 'schema-change';
    }
    if (/api|routes?|endpoints?/.test(pattern.source)) {
      return 'api-removal';
    }
    if (/auth|permission/.test(pattern.source)) {
      return 'permission-change';
    }
    return 'behavioral-change';
  }

  /**
   * Get file category for pattern
   */
  private getFileCategory(pattern: RegExp): string {
    if (/package|composer|requirements|Cargo|go\.mod/.test(pattern.source)) {
      return 'dependency';
    }
    if (/\.env/.test(pattern.source)) {
      return 'environment';
    }
    if (/\.config/.test(pattern.source)) {
      return 'configuration';
    }
    if (/migration|schema/.test(pattern.source)) {
      return 'database';
    }
    if (/api|routes?|endpoints?/.test(pattern.source)) {
      return 'API';
    }
    if (/middleware/.test(pattern.source)) {
      return 'middleware';
    }
    if (/auth|permission/.test(pattern.source)) {
      return 'authentication';
    }
    if (/swagger|openapi/.test(pattern.source)) {
      return 'API specification';
    }
    return 'project';
  }

  /**
   * Merge similar signals
   */
  private mergeSignals(signals: BreakingSignal[]): BreakingSignal[] {
    const merged: BreakingSignal[] = [];
    const seen = new Map<string, BreakingSignal>();

    for (const signal of signals) {
      const key = `${signal.type}:${signal.location || signal.description}`;
      
      if (seen.has(key)) {
        // Keep higher confidence
        const existing = seen.get(key)!;
        if (signal.confidence > existing.confidence) {
          seen.set(key, signal);
        }
      } else {
        seen.set(key, signal);
        merged.push(signal);
      }
    }

    // Sort by confidence (highest first)
    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if signals indicate a breaking change
   */
  isBreaking(signals: BreakingSignal[], threshold: number = 0.7): boolean {
    return signals.some(s => s.confidence >= threshold);
  }

  /**
   * Generate breaking change summary
   */
  summarize(signals: BreakingSignal[]): string {
    if (signals.length === 0) {
      return 'No breaking changes detected.';
    }

    const byType = signals.reduce((acc, s) => {
      acc[s.type] = acc[s.type] || [];
      acc[s.type].push(s);
      return acc;
    }, {} as Record<string, BreakingSignal[]>);

    const lines: string[] = ['Breaking Changes Detected:', ''];

    for (const [type, typeSignals] of Object.entries(byType)) {
      lines.push(`  ${type} (${typeSignals.length}):`);
      for (const signal of typeSignals) {
        lines.push(`    - ${signal.description}`);
        if (signal.location) {
          lines.push(`      Location: ${signal.location}`);
        }
        lines.push(`      Confidence: ${(signal.confidence * 100).toFixed(0)}%`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
