// Commitlint configuration
// Enforces Conventional Commits format
// Reference: https://www.conventionalcommits.org/

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Custom rules for Paper2GalGame
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting, no code change
        'refactor', // Code restructuring
        'perf', // Performance improvement
        'test', // Tests
        'build', // Build system
        'ci', // CI configuration
        'chore', // Maintenance
        'revert', // Revert commit
      ],
    ],
    'scope-enum': [
      1, // Warning level
      'always',
      [
        'webgal', // WebGAL engine
        'parser', // Script parser
        'paper', // Paper mode
        'tts', // TTS service
        'api', // API service
        'ui', // UI components
        'core', // Core functionality
        'config', // Configuration
        'deps', // Dependencies
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};
