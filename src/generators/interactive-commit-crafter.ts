/**
 * Interactive Commit Crafter
 * 
 * Provides an interactive CLI for crafting commit messages
 * with guided steps and suggestions.
 */

import inquirer, { QuestionCollection } from 'inquirer';
import {
  AnalysisResult,
  ConventionalCommitMessage,
  ConventionalCommitType,
  CommitCraftStep,
  CommitCraftState,
} from '../core/types';

// Commit types with descriptions
const COMMIT_TYPES: { name: ConventionalCommitType; description: string; emoji: string }[] = [
  { name: 'feat', description: 'A new feature', emoji: '✨' },
  { name: 'fix', description: 'A bug fix', emoji: '🐛' },
  { name: 'docs', description: 'Documentation only changes', emoji: '📝' },
  { name: 'style', description: 'Code style changes (formatting, semicolons, etc)', emoji: '💄' },
  { name: 'refactor', description: 'Code changes that neither fix a bug nor add a feature', emoji: '♻️' },
  { name: 'perf', description: 'Performance improvements', emoji: '⚡' },
  { name: 'test', description: 'Adding or updating tests', emoji: '🧪' },
  { name: 'build', description: 'Build system or external dependencies', emoji: '📦' },
  { name: 'ci', description: 'CI/CD configuration changes', emoji: '👷' },
  { name: 'chore', description: 'Other changes that don\'t modify src or test files', emoji: '🔧' },
  { name: 'revert', description: 'Reverts a previous commit', emoji: '⏪' },
  { name: 'wip', description: 'Work in progress', emoji: '🚧' },
  { name: 'merge', description: 'Merge branches', emoji: '🔀' },
];

// Scope suggestions by type
const SCOPE_SUGGESTIONS: Record<ConventionalCommitType, string[]> = {
  feat: ['api', 'ui', 'auth', 'database', 'config', 'core', 'utils'],
  fix: ['api', 'ui', 'auth', 'database', 'config', 'core', 'utils'],
  docs: ['readme', 'api', 'contributing', 'examples'],
  style: ['formatting', 'linting', 'format'],
  refactor: ['api', 'ui', 'database', 'core', 'utils'],
  perf: ['api', 'database', 'queries', 'caching'],
  test: ['unit', 'integration', 'e2e', 'coverage'],
  build: ['dependencies', 'docker', 'deployment'],
  ci: ['github-actions', 'travis', 'jenkins', 'gitlab-ci'],
  chore: ['dependencies', 'maintenance', 'cleanup'],
  revert: [],
  wip: [],
  merge: [],
};

export class InteractiveCommitCrafter {
  private state: CommitCraftState;
  private analysis: AnalysisResult;

  constructor() {
    this.state = { step: 'type' };
    this.analysis = {} as AnalysisResult;
  }

  /**
   * Start interactive commit crafting session
   */
  async start(analysis: AnalysisResult): Promise<ConventionalCommitMessage | null> {
    this.analysis = analysis;
    this.state = { step: 'type' };

    try {
      // Pre-fill from analysis
      this.prefillFromAnalysis();

      // Step 1: Select type
      await this.selectType();
      
      // Step 2: Select or enter scope
      await this.selectScope();
      
      // Step 3: Confirm or edit subject
      await this.confirmSubject();
      
      // Step 4: Optionally add body
      await this.addBody();
      
      // Step 5: Handle breaking changes
      await this.handleBreaking();
      
      // Step 6: Link issues
      await this.linkIssues();
      
      // Step 7: Review
      const message = await this.reviewAndConfirm();
      
      return message;
    } catch (error: any) {
      if (error.message === 'CANCELLED') {
        console.log('\nCommit cancelled.');
        return null;
      }
      throw error;
    }
  }

  /**
   * Pre-fill state from analysis
   */
  private prefillFromAnalysis(): void {
    // Pre-select type based on analysis
    this.state.selectedType = this.analysis.conventional.type;
    
    // Pre-fill subject
    this.state.subject = this.analysis.conventional.subject;
    
    // Pre-fill scope
    if (this.analysis.conventional.scope) {
      this.state.selectedScope = this.analysis.conventional.scope;
    }
    
    // Pre-fill breaking
    this.state.breaking = this.analysis.conventional.breaking;
    
    // Pre-fill issues
    if (this.analysis.linkedIssues.length > 0) {
      this.state.linkedIssues = this.analysis.linkedIssues;
    }
  }

  /**
   * Step 1: Select commit type
   */
  private async selectType(): Promise<void> {
    const suggestedType = this.state.selectedType || 'chore';
    
    const questions: QuestionCollection = [
      {
        type: 'list',
        name: 'type',
        message: 'Select the type of change:',
        default: COMMIT_TYPES.findIndex(t => t.name === suggestedType),
        choices: COMMIT_TYPES.map(t => ({
          name: `${t.emoji} ${t.name} - ${t.description}`,
          value: t.name,
        })),
      },
    ];

    const answers = await inquirer.prompt(questions);
    this.state.selectedType = answers.type;
    this.state.step = 'scope';
  }

  /**
   * Step 2: Select or enter scope
   */
  private async selectScope(): Promise<void> {
    const suggestions = SCOPE_SUGGESTIONS[this.state.selectedType!] || [];
    const suggestedScope = this.state.selectedScope;
    
    // Add suggested scope as default if exists
    const defaultIndex = suggestedScope && suggestions.includes(suggestedScope) 
      ? suggestions.indexOf(suggestedScope) 
      : suggestions.length;

    const questions: QuestionCollection = [
      {
        type: 'autocomplete',
        name: 'scope',
        message: 'Select or enter the scope (optional):',
        default: defaultIndex,
        source: async () => suggestions,
      },
      {
        type: 'input',
        name: 'customScope',
        message: 'Or enter a custom scope:',
        when: (answers: any) => answers.scope === '',
        validate: (input: string) => {
          if (!input) return true;
          return /^[a-z0-9-]+$/.test(input) || 'Scope must be lowercase alphanumeric with hyphens';
        },
      },
    ];

    const answers = await inquirer.prompt(questions);
    this.state.selectedScope = answers.customScope || answers.scope || undefined;
    this.state.step = 'subject';
  }

  /**
   * Step 3: Confirm or edit subject
   */
  private async confirmSubject(): Promise<void> {
    const suggestedSubject = this.state.subject || this.analysis.conventional.subject;
    
    const questions: QuestionCollection = [
      {
        type: 'editor',
        name: 'subject',
        message: 'Enter the commit message subject:',
        default: suggestedSubject,
        postfix: '.md',
        validate: (input: string) => {
          const lines = input.trim().split('\n');
          const firstLine = lines[0].trim();
          if (firstLine.length === 0) {
            return 'Subject cannot be empty';
          }
          if (firstLine.length > 100) {
            return 'Subject should be under 100 characters';
          }
          return true;
        },
      },
    ];

    const answers = await inquirer.prompt(questions);
    this.state.subject = answers.subject.trim().split('\n')[0];
    
    // Apply imperative mood fix
    this.state.subject = this.toImperativeMood(this.state.subject);
    
    this.state.step = 'body';
  }

  /**
   * Convert subject to imperative mood
   */
  private toImperativeMood(subject: string): string {
    const words = subject.split(' ');
    const firstWord = words[0].toLowerCase();
    
    const toImperative: Record<string, string> = {
      'adds': 'add',
      'added': 'add',
      'adding': 'add',
      'fixes': 'fix',
      'fixed': 'fix',
      'fixing': 'fix',
      'updates': 'update',
      'updated': 'update',
      'updating': 'update',
      'creates': 'create',
      'created': 'create',
      'creating': 'create',
      'removes': 'remove',
      'removed': 'remove',
      'removing': 'remove',
      'implements': 'implement',
      'implemented': 'implement',
      'implementing': 'implement',
    };

    if (toImperative[firstWord]) {
      words[0] = toImperative[firstWord];
      // Capitalize first letter
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    }

    return words.join(' ');
  }

  /**
   * Step 4: Optionally add body
   */
  private async addBody(): Promise<void> {
    const questions: QuestionCollection = [
      {
        type: 'confirm',
        name: 'addBody',
        message: 'Would you like to add a detailed body?',
        default: false,
      },
      {
        type: 'editor',
        name: 'body',
        message: 'Enter the commit body:',
        when: (answers: any) => answers.addBody,
        postfix: '.md',
      },
    ];

    const answers = await inquirer.prompt(questions);
    if (answers.addBody) {
      this.state.body = answers.body.trim();
    }
    this.state.step = 'breaking';
  }

  /**
   * Step 5: Handle breaking changes
   */
  private async handleBreaking(): Promise<void> {
    // Auto-detect breaking changes
    const detectedBreaking = this.analysis.breakingChanges.length > 0;
    
    if (!detectedBreaking && !this.state.breaking) {
      const questions: QuestionCollection = [
        {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Does this commit contain breaking changes?',
          default: false,
        },
      ];

      const answers = await inquirer.prompt(questions);
      this.state.breaking = answers.isBreaking;
    } else {
      this.state.breaking = detectedBreaking || this.state.breaking;
    }

    if (this.state.breaking) {
      const questions: QuestionCollection = [
        {
          type: 'input',
          name: 'breakingDescription',
          message: 'Describe the breaking change:',
          validate: (input: string) => {
            if (!input) {
              return 'Please provide a description of the breaking change';
            }
            return true;
          },
        },
      ];

      const answers = await inquirer.prompt(questions);
      this.state.breakingDescription = answers.breakingDescription;
    }

    this.state.step = 'issues';
  }

  /**
   * Step 6: Link issues
   */
  private async linkIssues(): Promise<void> {
    // Pre-fill from analysis
    const suggestedIssues = this.analysis.linkedIssues.map(i => i.id);
    
    if (suggestedIssues.length === 0) {
      const questions: QuestionCollection = [
        {
          type: 'confirm',
          name: 'linkIssue',
          message: 'Would you like to link an issue?',
          default: false,
        },
        {
          type: 'input',
          name: 'issueNumber',
          message: 'Enter issue number(s) (comma-separated):',
          when: (answers: any) => answers.linkIssue,
          validate: (input: string) => {
            if (!input.trim()) return false;
            return true;
          },
        },
      ];

      const answers = await inquirer.prompt(questions);
      
      if (answers.linkIssue && answers.issueNumber) {
        const issueIds = answers.issueNumber.split(',').map((s: string) => s.trim());
        this.state.linkedIssues = issueIds.map((id: string) => ({
          type: 'issue' as const,
          id,
          confidence: 1,
        }));
      }
    } else {
      console.log(`\nDetected issues: ${suggestedIssues.join(', ')}`);
    }

    this.state.step = 'review';
  }

  /**
   * Step 7: Review and confirm
   */
  private async reviewAndConfirm(): Promise<ConventionalCommitMessage> {
    const message = this.buildMessage();
    
    // Show preview
    console.log('\n' + '='.repeat(60));
    console.log('COMMIT MESSAGE PREVIEW');
    console.log('='.repeat(60));
    console.log(this.formatMessagePreview(message));
    console.log('='.repeat(60) + '\n');

    const questions: QuestionCollection = [
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '✅ Confirm and use this message', value: 'confirm' },
          { name: '✏️  Edit the message', value: 'edit' },
          { name: '🔄 Start over', value: 'restart' },
          { name: '❌ Cancel', value: 'cancel' },
        ],
      },
    ];

    const answers = await inquirer.prompt(questions);

    switch (answers.action) {
      case 'confirm':
        return message;
      
      case 'edit':
        return this.editMessage(message);
      
      case 'restart':
        this.state = { step: 'type' };
        this.prefillFromAnalysis();
        await this.selectType();
        await this.selectScope();
        await this.confirmSubject();
        await this.addBody();
        await this.handleBreaking();
        await this.linkIssues();
        return this.reviewAndConfirm();
      
      case 'cancel':
        throw new Error('CANCELLED');
    }

    return message;
  }

  /**
   * Build the commit message from state
   */
  private buildMessage(): ConventionalCommitMessage {
    const header = this.state.selectedScope
      ? `${this.state.selectedType}(${this.state.selectedScope}): ${this.state.subject}`
      : `${this.state.selectedType}: ${this.state.subject}`;

    const footerLines: string[] = [];
    
    if (this.state.breaking) {
      footerLines.push(`BREAKING CHANGE: ${this.state.breakingDescription || 'This change introduces breaking changes.'}`);
    }
    
    if (this.state.linkedIssues && this.state.linkedIssues.length > 0) {
      const issueRefs = this.state.linkedIssues.map(i => `#${i.id}`).join(', ');
      footerLines.push(`Closes ${issueRefs}`);
    }

    return {
      type: this.state.selectedType!,
      scope: this.state.selectedScope,
      subject: this.state.subject!,
      body: this.state.body,
      footer: footerLines.length > 0 ? footerLines.join('\n') : undefined,
      breaking: this.state.breaking || false,
      breakingDescription: this.state.breakingDescription,
      issueReferences: this.state.linkedIssues?.map(i => i.id) || [],
      coAuthors: this.state.coAuthors || [],
    };
  }

  /**
   * Edit an existing message
   */
  private async editMessage(message: ConventionalCommitMessage): Promise<ConventionalCommitMessage> {
    const questions: QuestionCollection = [
      {
        type: 'editor',
        name: 'editedMessage',
        message: 'Edit the commit message:',
        default: this.formatMessagePreview(message),
        postfix: '.md',
      },
    ];

    const answers = await inquirer.prompt(questions);
    
    // Parse the edited message (simple parsing)
    const lines = answers.editedMessage.trim().split('\n');
    const header = lines[0];
    
    // Update state with edited content
    const parsed = this.parseEditedMessage(answers.editedMessage);
    
    return {
      ...message,
      ...parsed,
    };
  }

  /**
   * Parse edited message
   */
  private parseEditedMessage(text: string): Partial<ConventionalCommitMessage> {
    const lines = text.trim().split('\n');
    const header = lines[0];
    
    // Parse header: type(scope): subject
    const headerMatch = header.match(/^(\w+)(?:\(([^)]+)\))?(?::\s*(.+))?$/);
    
    return {
      type: headerMatch?.[1] as ConventionalCommitType || 'chore',
      scope: headerMatch?.[2],
      subject: headerMatch?.[3] || lines[0],
      body: lines.slice(1, lines.indexOf('') !== -1 ? lines.indexOf('') : undefined).join('\n').trim() || undefined,
    };
  }

  /**
   * Format message for preview
   */
  private formatMessagePreview(message: ConventionalCommitMessage): string {
    const lines: string[] = [];
    
    // Header
    let header = message.type;
    if (message.scope) {
      header += `(${message.scope})`;
    }
    header += `: ${message.subject}`;
    lines.push(header);
    
    // Body
    if (message.body) {
      lines.push('');
      lines.push(message.body);
    }
    
    // Footer
    if (message.footer) {
      lines.push('');
      lines.push(message.footer);
    }
    
    return lines.join('\n');
  }
}
