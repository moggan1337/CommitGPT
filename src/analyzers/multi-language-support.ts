/**
 * Multi-Language Support
 * 
 * Provides internationalization support for commit messages in multiple languages.
 * Supports detection, translation, and generation of commit messages in various languages.
 */

import { DiffResult } from '../core/types';

// Language configurations
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  commitVerbs: Record<string, string[]>;
  conventionalMappings: Record<string, string>;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    commitVerbs: {
      feat: ['add', 'implement', 'create', 'introduce', 'enhance'],
      fix: ['fix', 'resolve', 'repair', 'correct', 'patch'],
      docs: ['update', 'improve', 'document', 'add'],
      style: ['improve', 'format', 'adjust', 'clean'],
      refactor: ['refactor', 'restructure', 'improve', 'optimize'],
      perf: ['optimize', 'improve', 'enhance', 'speed up'],
      test: ['add', 'update', 'improve', 'expand'],
      build: ['update', 'configure', 'setup', 'change'],
      ci: ['update', 'improve', 'configure', 'change'],
      chore: ['update', 'change', 'maintain', 'manage'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    commitVerbs: {
      feat: ['agregar', 'implementar', 'crear', 'introducir', 'mejorar'],
      fix: ['corregir', 'arreglar', 'resolver', 'reparar', 'solucionar'],
      docs: ['actualizar', 'mejorar', 'documentar', 'agregar'],
      style: ['mejorar', 'formatear', 'ajustar', 'limpiar'],
      refactor: ['refactorizar', 'restructurar', 'mejorar', 'optimizar'],
      perf: ['optimizar', 'mejorar', 'mejorar rendimiento'],
      test: ['agregar', 'actualizar', 'mejorar', 'expandir'],
      build: ['actualizar', 'configurar', 'configurar'],
      ci: ['actualizar', 'mejorar', 'configurar'],
      chore: ['actualizar', 'cambiar', 'mantener', 'gestionar'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    commitVerbs: {
      feat: ['ajouter', 'implémenter', 'créer', 'introduire', 'améliorer'],
      fix: ['corriger', 'résoudre', 'réparer', 'ajuster', 'réparer'],
      docs: ['mettre à jour', 'améliorer', 'documenter', 'ajouter'],
      style: ['améliorer', 'formater', 'ajuster', 'nettoyer'],
      refactor: ['refactoriser', 'restructurer', 'améliorer', 'optimiser'],
      perf: ['optimiser', 'améliorer', 'accélérer'],
      test: ['ajouter', 'mettre à jour', 'améliorer', 'étendre'],
      build: ['mettre à jour', 'configurer', 'installer'],
      ci: ['mettre à jour', 'améliorer', 'configurer'],
      chore: ['mettre à jour', 'modifier', 'maintenir', 'gérer'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    commitVerbs: {
      feat: ['hinzufügen', 'implementieren', 'erstellen', 'einführen', 'verbessern'],
      fix: ['beheben', 'korrigieren', 'reparieren', 'lösen', 'fixieren'],
      docs: ['aktualisieren', 'verbessern', 'dokumentieren', 'hinzufügen'],
      style: ['verbessern', 'formatieren', 'anpassen', 'bereinigen'],
      refactor: ['refaktorisieren', 'umstrukturieren', 'verbessern', 'optimieren'],
      perf: ['optimieren', 'verbessern', 'beschleunigen'],
      test: ['hinzufügen', 'aktualisieren', 'verbessern', 'erweitern'],
      build: ['aktualisieren', 'konfigurieren', 'einrichten'],
      ci: ['aktualisieren', 'verbessern', 'konfigurieren'],
      chore: ['aktualisieren', 'ändern', 'warten', 'verwalten'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    commitVerbs: {
      feat: ['adicionar', 'implementar', 'criar', 'introduzir', 'melhorar'],
      fix: ['corrigir', 'resolver', 'reparar', 'ajustar', 'consertar'],
      docs: ['atualizar', 'melhorar', 'documentar', 'adicionar'],
      style: ['melhorar', 'formatar', 'ajustar', 'limpar'],
      refactor: ['refatorar', 'restruturar', 'melhorar', 'otimizar'],
      perf: ['otimizar', 'melhorar', 'aumentar velocidade'],
      test: ['adicionar', 'atualizar', 'melhorar', 'expandir'],
      build: ['atualizar', 'configurar', 'configurar'],
      ci: ['atualizar', 'melhorar', 'configurar'],
      chore: ['atualizar', 'alterar', 'manter', 'gerenciar'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    commitVerbs: {
      feat: ['添加', '实现', '创建', '引入', '增强'],
      fix: ['修复', '解决', '修补', '更正', '处理'],
      docs: ['更新', '改进', '文档', '添加'],
      style: ['改进', '格式化', '调整', '清理'],
      refactor: ['重构', '重组', '改进', '优化'],
      perf: ['优化', '改进', '提升性能'],
      test: ['添加', '更新', '改进', '扩展'],
      build: ['更新', '配置', '设置'],
      ci: ['更新', '改进', '配置'],
      chore: ['更新', '修改', '维护', '管理'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    commitVerbs: {
      feat: ['追加', '実装', '作成', '導入', '強化'],
      fix: ['修正', '解決', '修补', '訂正', '対応'],
      docs: ['更新', '改善', 'ドキュメント', '追加'],
      style: ['改善', 'フォーマット', '調整', 'クリーンアップ'],
      refactor: ['リファクタリング', '再構成', '改善', '最適化'],
      perf: ['最適化', '改善', '高速化'],
      test: ['追加', '更新', '改善', '拡張'],
      build: ['更新', '設定', '構成'],
      ci: ['更新', '改善', '設定'],
      chore: ['更新', '変更', 'メンテナンス', '管理'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    commitVerbs: {
      feat: ['추가', '구현', '생성', '도입', '강화'],
      fix: ['수정', '해결', '패치', '정정', '처리'],
      docs: ['업데이트', '개선', '문서', '추가'],
      style: ['개선', '포맷', '조정', '정리'],
      refactor: ['리팩토링', '재구성', '개선', '최적화'],
      perf: ['최적화', '개선', '성능 향상'],
      test: ['추가', '업데이트', '개선', '확장'],
      build: ['업데이트', '설정', '구성'],
      ci: ['업데이트', '개선', '설정'],
      chore: ['업데이트', '변경', '유지보수', '관리'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    commitVerbs: {
      feat: ['добавить', 'реализовать', 'создать', 'внедрить', 'улучшить'],
      fix: ['исправить', 'устранить', 'починить', 'исправить'],
      docs: ['обновить', 'улучшить', 'документировать', 'добавить'],
      style: ['улучшить', 'форматировать', 'настроить', 'очистить'],
      refactor: ['рефакторить', 'перестроить', 'улучшить', 'оптимизировать'],
      perf: ['оптимизировать', 'улучшить', 'ускорить'],
      test: ['добавить', 'обновить', 'улучшить', 'расширить'],
      build: ['обновить', 'настроить', 'установить'],
      ci: ['обновить', 'улучшить', 'настроить'],
      chore: ['обновить', 'изменить', 'поддерживать', 'управлять'],
    },
    conventionalMappings: {
      feat: 'feat',
      fix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      test: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore',
    },
  },
};

// File extension to language mapping
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

export class MultiLanguageSupport {
  private currentLanguage: string;
  private supportedLanguages: string[];

  constructor(defaultLanguage: string = 'en') {
    this.currentLanguage = this.validateLanguage(defaultLanguage) ? defaultLanguage : 'en';
    this.supportedLanguages = Object.keys(LANGUAGE_CONFIGS);
  }

  /**
   * Detect the primary language of the codebase from diff
   */
  detectLanguage(diff: DiffResult): string {
    const languageCounts: Record<string, number> = {};

    for (const file of diff.files) {
      const ext = this.getFileExtension(file.path);
      const lang = EXTENSION_TO_LANGUAGE[ext];
      
      if (lang) {
        // Weight by additions (new code)
        const weight = file.additions;
        languageCounts[lang] = (languageCounts[lang] || 0) + weight;
      }
    }

    // Map programming language to commit language
    const programmingLang = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Return the commit language (not the programming language)
    return this.programmingToCommitLanguage(programmingLang || 'javascript');
  }

  /**
   * Map programming language to commit message language
   */
  private programmingToCommitLanguage(programmingLang: string): string {
    // This could be enhanced to use git config or project settings
    const mappings: Record<string, string> = {
      typescript: 'en',
      javascript: 'en',
      python: 'en',
      java: 'en',
      go: 'en',
      rust: 'en',
      ruby: 'en',
      php: 'en',
      csharp: 'en',
      cpp: 'en',
      c: 'en',
    };

    return mappings[programmingLang] || this.currentLanguage;
  }

  /**
   * Get file extension
   */
  private getFileExtension(path: string): string {
    const match = path.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  /**
   * Get verb for commit type in specified language
   */
  getVerb(type: string, language?: string): string {
    const lang = this.validateLanguage(language) ? language! : this.currentLanguage;
    const config = LANGUAGE_CONFIGS[lang];
    
    if (!config) {
      return type;
    }

    const verbs = config.commitVerbs[type as keyof typeof config.commitVerbs];
    return verbs?.[0] || type;
  }

  /**
   * Translate commit message to target language
   */
  translate(
    subject: string,
    fromLang: string,
    toLang: string
  ): string {
    if (fromLang === toLang) {
      return subject;
    }

    // Basic word-level translation
    const fromConfig = LANGUAGE_CONFIGS[fromLang];
    const toConfig = LANGUAGE_CONFIGS[toLang];

    if (!fromConfig || !toConfig) {
      return subject;
    }

    let translated = subject;

    // Replace verbs
    for (const [type, verbs] of Object.entries(fromConfig.commitVerbs)) {
      for (const verb of verbs) {
        const regex = new RegExp(`^${verb}\\b`, 'i');
        const toVerbs = toConfig.commitVerbs[type as keyof typeof toConfig.commitVerbs];
        if (toVerbs && regex.test(translated)) {
          translated = translated.replace(regex, toVerbs[0]);
          break;
        }
      }
    }

    return translated;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): { code: string; name: string; nativeName: string }[] {
    return Object.values(LANGUAGE_CONFIGS).map(config => ({
      code: config.code,
      name: config.name,
      nativeName: config.nativeName,
    }));
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language: string): LanguageConfig | null {
    return LANGUAGE_CONFIGS[language] || null;
  }

  /**
   * Set current language
   */
  setLanguage(language: string): boolean {
    if (this.validateLanguage(language)) {
      this.currentLanguage = language;
      return true;
    }
    return false;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Validate if language is supported
   */
  validateLanguage(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Format commit type for display
   */
  formatType(type: string, language?: string): string {
    const lang = this.validateLanguage(language) ? language! : this.currentLanguage;
    const config = LANGUAGE_CONFIGS[lang];

    if (!config) {
      return type;
    }

    const displayNames: Record<string, Record<string, string>> = {
      en: {
        feat: 'Feature',
        fix: 'Bug Fix',
        docs: 'Documentation',
        style: 'Styling',
        refactor: 'Refactoring',
        perf: 'Performance',
        test: 'Tests',
        build: 'Build',
        ci: 'CI/CD',
        chore: 'Chore',
      },
      es: {
        feat: 'Característica',
        fix: 'Corrección',
        docs: 'Documentación',
        style: 'Estilo',
        refactor: 'Refactorización',
        perf: 'Rendimiento',
        test: 'Pruebas',
        build: 'Compilación',
        ci: 'CI/CD',
        chore: 'Tarea',
      },
      fr: {
        feat: 'Fonctionnalité',
        fix: 'Correction',
        docs: 'Documentation',
        style: 'Style',
        refactor: 'Refactorisation',
        perf: 'Performance',
        test: 'Tests',
        build: 'Compilation',
        ci: 'CI/CD',
        chore: 'Tâche',
      },
      de: {
        feat: 'Funktion',
        fix: 'Fehlerbehebung',
        docs: 'Dokumentation',
        style: 'Stil',
        refactor: 'Refaktorisierung',
        perf: 'Leistung',
        test: 'Tests',
        build: 'Build',
        ci: 'CI/CD',
        chore: 'Aufgabe',
      },
    };

    return displayNames[lang]?.[type] || type;
  }

  /**
   * Generate localized breaking change text
   */
  formatBreakingChange(language?: string): string {
    const lang = this.validateLanguage(language) ? language! : this.currentLanguage;
    
    const texts: Record<string, string> = {
      en: 'BREAKING CHANGE',
      es: 'CAMBIO ROMPEDOR',
      fr: 'CHANGEMENT RUPTURE',
      de: 'BREAKING CHANGE',
      pt: 'MUDANÇA RUPTURA',
      zh: '破坏性变更',
      ja: '破壊的変更',
      ko: 'Breaking 변경',
      ru: 'КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ',
    };

    return texts[lang] || 'BREAKING CHANGE';
  }
}
