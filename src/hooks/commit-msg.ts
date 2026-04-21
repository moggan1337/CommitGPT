/**
 * Git Commit Hook - commit-msg
 * 
 * Installs as .git/hooks/commit-msg to validate and enhance commit messages.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../utils/config-manager';
import { ConventionalCommitFormatter } from '../analyzers/conventional-commit-formatter';

interface HookConfig {
  validateConventional: boolean;
  maxSubjectLength: number;
  autoFormat: boolean;
  rejectInvalid: boolean;
}

const DEFAULT_HOOK_CONFIG: HookConfig = {
  validateConventional: true,
  maxSubjectLength: 72,
  autoFormat: false,
  rejectInvalid: false,
};

export class CommitMsgHook {
  private config: HookConfig;
  private formatter: ConventionalCommitFormatter;

  constructor(config?: Partial<HookConfig>) {
    this.config = { ...DEFAULT_HOOK_CONFIG, ...config };
    this.formatter = new ConventionalCommitFormatter(this.config.maxSubjectLength);
  }

  /**
   * Run the hook
   */
  async run(commitMsgPath: string): Promise<{ valid: boolean; message: string }> {
    try {
      // Read commit message
      const message = fs.readFileSync(commitMsgPath, 'utf-8');
      
      // Skip if empty or merge commit
      if (!message.trim() || message.includes('Merge branch')) {
        return { valid: true, message: 'Merge commit - skipping validation' };
      }

      // Validate conventional format if enabled
      if (this.config.validateConventional) {
        const validation = this.validate(message);
        if (!validation.valid) {
          if (this.config.rejectInvalid) {
            return { valid: false, message: validation.errors.join('\n') };
          } else {
            console.warn('⚠️  Commit message does not follow conventional format:');
            validation.errors.forEach(err => console.warn(`  - ${err}`));
          }
        }
      }

      // Auto-format if enabled
      if (this.config.autoFormat) {
        const formatted = this.format(message);
        if (formatted !== message) {
          fs.writeFileSync(commitMsgPath, formatted, 'utf-8');
          console.log('✓ Commit message auto-formatted');
        }
      }

      return { valid: true, message: 'Commit message validated' };
    } catch (error: any) {
      return { valid: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * Validate commit message
   */
  validate(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = message.split('\n');
    const header = lines[0];

    // Check header format
    const headerPattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
    if (!headerPattern.test(header)) {
      errors.push('Header must follow format: type(scope): subject');
      errors.push('  Example: feat(auth): add login functionality');
    } else {
      // Check type
      const typeMatch = header.match(/^(\w+)/);
      if (typeMatch) {
        const validTypes = [
          'feat', 'fix', 'docs', 'style', 'refactor',
          'perf', 'test', 'build', 'ci', 'chore', 'revert'
        ];
        if (!validTypes.includes(typeMatch[1])) {
          errors.push(`Invalid type: ${typeMatch[1]}`);
          errors.push(`  Valid types: ${validTypes.join(', ')}`);
        }
      }

      // Check subject length
      const subjectMatch = header.match(/:\s*(.+)$/);
      if (subjectMatch && subjectMatch[1].length > this.config.maxSubjectLength) {
        errors.push(`Subject exceeds ${this.config.maxSubjectLength} characters`);
      }

      // Check for trailing period
      if (subjectMatch && subjectMatch[1].endsWith('.')) {
        errors.push('Subject should not end with a period');
      }

      // Check scope format
      const scopeMatch = header.match(/\(([^)]+)\)/);
      if (scopeMatch && scopeMatch[1]) {
        if (!/^[a-z0-9-]+$/.test(scopeMatch[1])) {
          errors.push('Scope must be lowercase alphanumeric with hyphens');
        }
      }
    }

    // Check for breaking change
    if (message.includes('BREAKING')) {
      const hasFooter = lines.some(l => l.startsWith('BREAKING CHANGE:'));
      if (!hasFooter) {
        errors.push('Breaking change should include BREAKING CHANGE: footer');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format commit message
   */
  format(message: string): string {
    const lines = message.split('\n');
    const header = lines[0];

    // Parse and reformat header
    const parsed = this.formatter.parse(message);
    if (parsed) {
      return this.formatter.toString(parsed);
    }

    // Basic cleanup if not conventional
    let formatted = header;
    
    // Ensure lowercase first letter (imperative mood)
    if (formatted[0] === formatted[0].toUpperCase() && formatted[0] !== formatted[0].toLowerCase()) {
      formatted = formatted[0].toLowerCase() + formatted.slice(1);
    }

    // Remove trailing period
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }

    // Truncate if too long
    const subjectMatch = formatted.match(/:\s*(.+)$/);
    if (subjectMatch && subjectMatch[1].length > this.config.maxSubjectLength) {
      const [prefix] = formatted.split(':');
      const maxSubjectLen = this.config.maxSubjectLength - prefix.length - 2;
      formatted = `${prefix}: ${subjectMatch[1].substring(0, maxSubjectLen).trim()}...`;
    }

    // Reconstruct message
    const body = lines.slice(1).join('\n');
    return body ? `${formatted}\n\n${body}` : formatted;
  }
}

/**
 * Install the commit-msg hook
 */
export async function installHook(
  repoPath: string = process.cwd(),
  options?: Partial<HookConfig>
): Promise<boolean> {
  const hookDir = path.join(repoPath, '.git', 'hooks');
  const hookPath = path.join(hookDir, 'commit-msg');

  // Ensure hooks directory exists
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }

  // Generate hook script
  const hookScript = `#!/bin/sh
# CommitGPT commit-msg hook
# Generated by CommitGPT

COMMIGPT_HOOK_PATH="$(cd "$(dirname "$0")/.." && pwd)/node_modules/.bin/commitgpt-hook"

if [ -f "$COMMIGPT_HOOK_PATH" ]; then
  node "$COMMIGPT_HOOK_PATH" "$1"
else
  # Fallback: basic validation
  node -e "
    const fs = require('fs');
    const msg = fs.readFileSync(process.argv[1], 'utf-8');
    const lines = msg.split('\\n');
    const header = lines[0];
    
    // Basic length check
    const subject = header.match(/:\\s*(.+)$/);
    if (subject && subject[1].length > 72) {
      console.error('⚠️  Subject exceeds 72 characters');
    }
    
    // Check trailing period
    if (subject && subject[1].endsWith('.')) {
      console.error('⚠️  Subject should not end with a period');
    }
  " "$1"
fi
`;

  try {
    fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
    console.log(`✓ Commit hook installed at: ${hookPath}`);
    return true;
  } catch (error) {
    console.error('Failed to install hook:', error);
    return false;
  }
}

/**
 * Uninstall the commit-msg hook
 */
export async function uninstallHook(repoPath: string = process.cwd()): Promise<boolean> {
  const hookPath = path.join(repoPath, '.git', 'hooks', 'commit-msg');

  try {
    if (fs.existsSync(hookPath)) {
      fs.unlinkSync(hookPath);
      console.log('✓ Commit hook uninstalled');
    }
    return true;
  } catch (error) {
    console.error('Failed to uninstall hook:', error);
    return false;
  }
}

// CLI entry point
if (require.main === module) {
  const hook = new CommitMsgHook();
  const [,, commitMsgPath] = process.argv;
  
  if (!commitMsgPath) {
    console.error('Usage: commit-msg <commit-message-file>');
    process.exit(1);
  }

  hook.run(commitMsgPath).then(result => {
    if (!result.valid) {
      console.error('❌', result.message);
      process.exit(1);
    }
    console.log('✓', result.message);
  });
}
