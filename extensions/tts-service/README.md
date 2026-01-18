# @paper2galgame/tts-service

TTS (Text-to-Speech) voice synthesis service for Paper2GalGame, supporting dual TTS providers with intelligent caching, emotion detection, and batch processing.

## Features

- **Dual TTS Providers**
  - Minimax Speech-02 (production, high-quality with emotion control)
  - VOICEVOX (development, free local Japanese TTS)

- **Intelligent Caching**
  - Two-tier caching: memory LRU + disk persistence
  - Target: >80% cache hit rate

- **Emotion Detection**
  - Automatic emotion detection from text
  - Character-appropriate emotion mapping
  - Support for Chinese, Japanese, and English

- **Batch Processing**
  - Concurrent generation with rate limiting
  - WebGAL script parsing
  - Progress tracking

## Installation

```bash
cd extensions/tts-service
yarn install
```

## Configuration

### Environment Variables

```bash
# TTS Provider Selection
TTS_PROVIDER=voicevox  # or 'minimax'

# Minimax Configuration
MINIMAX_API_KEY=your_api_key
MINIMAX_GROUP_ID=your_group_id
MINIMAX_MODEL=speech-02-turbo

# VOICEVOX Configuration
VOICEVOX_PORT=50021
```

## Usage

### Basic Usage

```typescript
import { createTTSService } from '@paper2galgame/tts-service';

const ttsService = createTTSService();

// Generate speech
const audioUrl = await ttsService.generateSpeech(
  'みなさん、こんにちは！',
  'nene',
  neneVoiceSettings,
  { emotion: 'happy' }
);
```

### Batch Processing

```typescript
import { BatchTTSProcessor } from '@paper2galgame/tts-service';

const processor = new BatchTTSProcessor(ttsService);
processor.setCharacterConfigs(characterVoiceConfigs);

// Pre-generate audio for WebGAL script
const audioMap = await processor.preGenerateScriptAudio(
  webgalScript,
  (completed, total) => console.log(`Progress: ${completed}/${total}`)
);
```

### Emotion Detection

```typescript
import { detectEmotion, detectEmotionDetailed } from '@paper2galgame/tts-service';

// Simple detection
const emotion = detectEmotion('哇！太棒了！！');
// => 'excited'

// Detailed analysis
const analysis = detectEmotionDetailed('但是这里有个问题...');
// => { emotion: 'serious', confidence: 0.7, factors: {...}, indicators: [...] }
```

## Character Voice Mappings

| Character | VOICEVOX Speaker | Minimax Voice |
|-----------|------------------|---------------|
| 绫地宁宁 (nene) | 四国めたん (2) | Sweet_Girl_2 |
| 丛雨 (murasame) | ずんだもん (3) | Lively_Girl |
| 在原七海 (nanami) | 春日部つむぎ (8) | Lovely_Girl |
| 因幡巡 (meguru) | 四国めたん (2) | Wise_Woman |

## API Reference

### TTSService

Main service class for TTS generation.

```typescript
class TTSService {
  generateSpeech(
    text: string,
    characterId: string,
    voiceSettings: CharacterVoiceSettings,
    options?: TTSOptions
  ): Promise<string>;

  getProviderStatuses(): Promise<ProviderStatus[]>;
  isAnyProviderAvailable(): Promise<boolean>;
  setPreferredProvider(provider: 'minimax' | 'voicevox'): void;
  getCacheStats(): CacheStats | null;
  clearCache(): Promise<void>;
}
```

### BatchTTSProcessor

Batch processing for WebGAL scripts.

```typescript
class BatchTTSProcessor {
  setCharacterConfigs(configs: Map<string, CharacterVoiceSettings>): void;
  processBatch(request: BatchTTSRequest): Promise<BatchTTSResult>;
  preGenerateScriptAudio(
    script: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>>;
  extractSayCommands(script: string): SayCommand[];
  detectEmotion(text: string): EmotionAnalysis;
}
```

### AudioCache

Two-tier audio caching system.

```typescript
class AudioCache {
  generateKey(text: string, characterId: string, emotion: TTSEmotion): string;
  get(key: string): Promise<string | null>;
  store(key: string, audioBuffer: ArrayBuffer, metadata?: object): Promise<string>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): CacheStats;
  cleanOldEntries(maxAgeDays?: number): Promise<number>;
}
```

## Performance Targets

- TTS generation speed: < 3 seconds/sentence
- Cache hit rate: > 80%
- Memory usage: < 100MB for cache

## Error Handling

The service includes:
- Automatic retry with exponential backoff (3 attempts)
- Provider fallback (Minimax → VOICEVOX)
- Graceful degradation when all providers fail

## Testing

```bash
yarn test
```

## License

MIT

---

*Part of Paper2GalGame project*
