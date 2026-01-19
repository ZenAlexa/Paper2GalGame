/**
 * Basic functionality tests for Script Generator
 */

import { describe, expect, test } from '@jest/globals';
import { getAvailableCharacters, getCharacter, validateCharacterSelection } from '../characters';
import type { WebGALScript } from '../types';
import { ScriptValidator } from '../validator';

describe('Character Configuration', () => {
  test('should return available character IDs', () => {
    const characters = getAvailableCharacters();
    expect(characters).toContain('nene');
    expect(characters).toContain('murasame');
    expect(characters).toContain('nanami');
    expect(characters).toContain('meguru');
  });

  test('should get character by ID', () => {
    const nene = getCharacter('nene');
    expect(nene).toBeTruthy();
    expect(nene?.name.zh).toBe('绫地宁宁');
    expect(nene?.source).toBe('魔女の夜宴 (サノバウィッチ)');
  });

  test('should validate character selection', () => {
    const validSelection = validateCharacterSelection(['nene', 'murasame']);
    expect(validSelection.valid).toBe(true);
    expect(validSelection.validCharacters).toEqual(['nene', 'murasame']);

    const invalidSelection = validateCharacterSelection(['invalid']);
    expect(invalidSelection.valid).toBe(false);
    expect(invalidSelection.errors).toContain('Unknown character ID: invalid');
  });
});

describe('Script Validator', () => {
  const validator = new ScriptValidator();

  test('should validate basic WebGAL script structure', async () => {
    const mockScript: WebGALScript = {
      metadata: {
        title: 'Test Script',
        paperTitle: 'Test Paper',
        timestamp: new Date(),
        version: '0.1.0',
        language: 'zh',
        characters: ['nene', 'murasame'],
        totalDuration: 300,
      },
      scenes: [
        {
          name: 'scene_1',
          title: '开场介绍',
          lines: [
            {
              command: 'changeBg',
              params: ['教室.webp'],
              options: {},
              raw: 'changeBg:教室.webp;',
            },
            {
              command: 'say',
              params: ['大家好，今天我们来学习这篇论文。'],
              options: {
                speaker: '绫地宁宁',
                vocal: 'nene_001.wav',
              },
              raw: 'say:大家好，今天我们来学习这篇论文。 -speaker=绫地宁宁 -vocal=nene_001.wav;',
            },
          ],
          metadata: {
            type: 'introduction',
            objectives: ['介绍论文主题'],
            duration: 10,
          },
        },
      ],
    };

    const result = await validator.validateScript(mockScript);
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThan(0.8);
  });

  test('should detect syntax errors', async () => {
    const invalidScript: WebGALScript = {
      metadata: {
        title: 'Invalid Script',
        paperTitle: 'Test Paper',
        timestamp: new Date(),
        version: '0.1.0',
        language: 'zh',
        characters: ['nene'],
        totalDuration: 0,
      },
      scenes: [
        {
          name: 'scene_1',
          title: 'Invalid Scene',
          lines: [
            {
              // biome-ignore lint/suspicious/noExplicitAny: Testing invalid command input
              command: 'invalidCommand' as any,
              params: [],
              options: {},
              raw: 'invalidCommand:;',
            },
          ],
          metadata: {
            type: 'content',
            objectives: [],
            duration: 0,
          },
        },
      ],
    };

    const result = await validator.validateScript(invalidScript);
    expect(result.isValid).toBe(false);
    expect(result.summary.errors.length).toBeGreaterThan(0);
  });
});

describe('Module Integration', () => {
  test('should export main classes', () => {
    const { ScriptValidator } = require('../index');
    expect(ScriptValidator).toBeDefined();
  });

  test('should export character functions', () => {
    const { getAvailableCharacters, getCharacter } = require('../index');
    expect(getAvailableCharacters).toBeDefined();
    expect(getCharacter).toBeDefined();
  });
});

describe('Character Personality Tests', () => {
  test('should have accurate character personalities', () => {
    const nene = getCharacter('nene');
    expect(nene?.personality).toContain('温柔体贴的大姐姐性格');
    expect(nene?.paperRole).toBe('主持人和总结者');

    const murasame = getCharacter('murasame');
    expect(murasame?.personality).toContain('活泼开朗的元气少女');
    expect(murasame?.phrases).toContain('诶诶！这个好有趣！');

    const nanami = getCharacter('nanami');
    expect(nanami?.personality).toContain('理性严谨的学者型');
    expect(nanami?.phrases).toContain('从逻辑上分析的话');

    const meguru = getCharacter('meguru');
    expect(meguru?.phrases).toContain('ciallo～大家好！');
  });

  test('should have proper voice settings', () => {
    const nene = getCharacter('nene');
    expect(nene?.voiceSettings.voicevox.speaker).toBe(2);
    expect(nene?.voiceSettings.minimax.voice).toBe('Sweet_Girl_2');

    const murasame = getCharacter('murasame');
    expect(murasame?.voiceSettings.voicevox.speaker).toBe(3);
    expect(murasame?.voiceSettings.minimax.voice).toBe('Lively_Girl');
  });
});
