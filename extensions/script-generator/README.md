# Paper2GalGame Script Generator

AI-powered script generator for converting academic papers into WebGAL format educational visual novels.

## Overview

The Script Generator module uses cutting-edge AI models via OpenRouter API to transform structured paper data into engaging WebGAL scripts featuring four distinct characters from popular visual novels.

## Features

- **AI-Powered Generation**: Uses latest Gemini 3.0 Flash Preview model for high-quality script generation
- **Character System**: Four carefully researched characters with accurate personalities and speaking styles
- **Multi-language Support**: Generate scripts in Chinese and Japanese
- **Educational Focus**: Maintains balance between entertainment and educational value
- **WebGAL Compatibility**: Generates scripts that comply with WebGAL syntax standards
- **Quality Validation**: Comprehensive validation system for syntax, character consistency, and educational content

## Characters

### 绫地宁宁 (Ayachi Nene)
- **Source**: 魔女の夜宴 (Sanoba Witch)
- **Role**: Main host and summarizer
- **Personality**: Gentle, caring big sister type with academic interests

### 丛雨 (Murasame)
- **Source**: 千恋＊万花 (Senren Banka)
- **Role**: Energetic questioner and atmosphere enhancer
- **Personality**: Lively, curious with 500-year-old wisdom

### 在原七海 (Arihara Nanami)
- **Source**: Riddle Joker
- **Role**: In-depth analyzer and critical thinker
- **Personality**: Rational, precise scholar with technical expertise

### 因幡巡 (Inaba Meguru)
- **Source**: 魔女の夜宴 (Sanoba Witch)
- **Role**: Life-oriented explainer and relatable commentator
- **Personality**: Fashionable exterior hiding a gaming enthusiast

## Installation

```bash
# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test
```

## Usage

### Basic Usage

```typescript
import PaperScriptGenerator from '@paper2galgame/script-generator';

// Initialize with OpenRouter API key
const generator = new PaperScriptGenerator('your-openrouter-api-key');

// Generate script from parsed paper
const result = await generator.generateValidatedScript(paperData, {
  language: 'zh',
  characters: ['nene', 'murasame', 'nanami', 'meguru'],
  style: {
    educationalWeight: 0.8,
    complexity: 'intermediate',
    interactive: true,
    audience: 'student'
  },
  content: {
    includeMethodology: true,
    includeResults: true,
    includeConclusions: true,
    maxLength: 50
  },
  voice: {
    generateVoice: true,
    provider: 'voicevox'
  }
});

if (result.success) {
  console.log('Generated script:', result.script);
  console.log('Quality score:', result.metadata.quality.overallScore);
} else {
  console.error('Generation failed:', result.error);
}
```

### Advanced Usage

```typescript
import { ScriptGenerator, ScriptValidator, getCharacter } from '@paper2galgame/script-generator';

// Use individual components
const generator = new ScriptGenerator({
  apiKey: 'your-api-key',
  defaultModel: 'google/gemini-3-flash-preview'
});

const validator = new ScriptValidator();

// Generate script
const generationResult = await generator.generateScript(paperData, options);

// Validate script
const validationResult = await validator.validateScript(generationResult.script);

// Get character details
const nene = getCharacter('nene');
console.log(nene?.personality);
```

## Configuration

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=your_openrouter_api_key

# Optional
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
HTTP_REFERER=https://paper2galgame.com
```

### Generation Options

```typescript
interface GenerationOptions {
  language: 'zh' | 'jp';
  characters: string[]; // Array of character IDs
  style: {
    educationalWeight: number; // 0-1, balance between education and entertainment
    complexity: 'simple' | 'intermediate' | 'advanced';
    interactive: boolean;
    audience: 'general' | 'academic' | 'student';
  };
  content: {
    includeMethodology: boolean;
    includeResults: boolean;
    includeConclusions: boolean;
    maxLength?: number;
  };
  voice: {
    generateVoice: boolean;
    provider: 'voicevox' | 'minimax';
  };
}
```

## Output Format

The generator produces WebGAL-compatible scripts:

```webgal
changeBg:教室.webp;
changeFigure:nene.webp -center;
say:大家好，今天我们来学习这篇论文呢。 -speaker=绫地宁宁 -vocal=nene_001.wav;
changeFigure:murasame.webp -left;
say:诶诶！听起来好有趣的样子！ -speaker=丛雨 -vocal=murasame_001.wav;
wait:1000;
```

## API Reference

### PaperScriptGenerator

Main class combining generation and validation.

#### Methods

- `generateValidatedScript(paperData, options)` - Generate and validate script
- `testConfiguration()` - Test API connection
- `getAvailableCharacters()` - Get available character IDs
- `getCharacterDetails(id)` - Get character configuration

### ScriptGenerator

Core script generation engine.

#### Methods

- `generateScript(paperData, options)` - Generate script from paper data
- `testConfiguration()` - Test OpenRouter connection

### ScriptValidator

Script validation and quality assessment.

#### Methods

- `validateScript(script, config)` - Comprehensive script validation

### Character Functions

- `getAvailableCharacters()` - Returns array of character IDs
- `getCharacter(id)` - Returns character configuration
- `validateCharacterSelection(ids)` - Validates character selection

## Quality Metrics

The validator evaluates scripts on multiple dimensions:

- **Syntax Score**: WebGAL command validity and formatting
- **Character Score**: Character consistency and authenticity
- **Educational Score**: Educational content quality and accuracy
- **Flow Score**: Script pacing and dialogue flow

## Testing

```bash
# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run specific test file
yarn test character-configs.test.ts
```

## Development

### Adding New Characters

1. Research character from official sources
2. Add configuration to `src/characters/character-configs.ts`
3. Update voice settings mapping
4. Add tests for character validation

### Extending Validation

1. Add new validation rules to `src/validator/script-validator.ts`
2. Update validation result interfaces
3. Add corresponding tests

## Dependencies

### Core Dependencies

- `@paper2galgame/paper-parser` - Paper parsing functionality
- `node-fetch` - HTTP requests to OpenRouter API
- `uuid` - Unique identifier generation

### Development Dependencies

- `typescript` - TypeScript compiler
- `jest` - Testing framework
- `eslint` - Code linting
- `ts-jest` - TypeScript testing

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure character authenticity for new character additions

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use the GitHub issue tracker.

---

*Part of the Paper2GalGame project - transforming academic learning through visual novel experiences.*