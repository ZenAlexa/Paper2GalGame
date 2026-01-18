/**
 * TTS Route - Handle voice synthesis
 */

import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store.js';
import type { ApiResponse, AudioData, TTSRequest } from '../types/index.js';

const router = Router();

/**
 * POST /api/tts
 * Generate voice audio for dialogues
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, provider = 'minimax' } = req.body as TTSRequest;

    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_SESSION',
          message: 'Session ID is required'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or expired'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(response);
    }

    if (!session.script) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_SCRIPT',
          message: 'Script not generated yet'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    console.log(`[TTS] Starting synthesis for session ${sessionId} with provider ${provider}`);

    sessionStore.updateStatus(sessionId, 'synthesizing');

    try {
      // Import TTS service and character configs
      const { createTTSService, BatchTTSProcessor } = await import('@paper2galgame/tts-service');
      const { CHARACTER_CONFIGS } = await import('@paper2galgame/script-generator');

      // Create TTS service - it reads config from environment
      const ttsService = createTTSService();

      // Build character voice settings map
      const characterConfigs = new Map<string, {
        voicevox: { speaker: number; emotion: string; speed: number };
        minimax: { model: string; voice: string; emotion: string };
      }>();

      for (const charConfig of Object.values(CHARACTER_CONFIGS)) {
        characterConfigs.set(charConfig.id, charConfig.voiceSettings);
      }

      // Create batch processor with character configs
      const batchProcessor = new BatchTTSProcessor(ttsService, characterConfigs);

      // Prepare batch request
      const items = session.script.dialogues.map((dialogue) => ({
        id: dialogue.id,
        text: dialogue.textJp || dialogue.text, // Prefer Japanese for TTS
        characterId: dialogue.character,
        emotion: dialogue.emotion as 'neutral' | 'happy' | 'serious' | 'excited' | 'calm' | 'sad' | 'angry' | undefined
      }));

      console.log(`[TTS] Processing ${items.length} dialogues...`);

      // Process batch
      const result = await batchProcessor.processBatch({
        batchId: `tts_${sessionId}`,
        items,
        concurrency: 3,
        onProgress: (completed: number, total: number, currentItem?: string) => {
          const percent = Math.round((completed / total) * 100);
          console.log(`[TTS] Progress: ${percent}% (${completed}/${total}) - ${currentItem || ''}`);
        }
      });

      // Collect audio files from result
      const audioFiles: AudioData['files'] = [];
      let totalDuration = 0;

      for (const item of result.successful) {
        audioFiles.push({
          dialogueId: item.id,
          filename: `${item.id}.mp3`,
          url: item.url,
          duration: 3 // Default 3 seconds if duration unknown
        });
        totalDuration += 3;
      }

      const audioData: AudioData = {
        files: audioFiles,
        totalDuration
      };

      sessionStore.setAudioData(sessionId, audioData);

      console.log(`[TTS] Generated ${audioFiles.length}/${items.length} audio files`);
      if (result.failed.length > 0) {
        console.log(`[TTS] Failed items: ${result.failed.map(f => f.id).join(', ')}`);
      }

      const response: ApiResponse<{
        sessionId: string;
        audio: {
          totalFiles: number;
          totalDuration: number;
          successRate: number;
        };
      }> = {
        success: true,
        data: {
          sessionId,
          audio: {
            totalFiles: audioFiles.length,
            totalDuration: Math.round(totalDuration),
            successRate: Math.round((audioFiles.length / items.length) * 100)
          }
        },
        timestamp: new Date().toISOString()
      };

      return res.json(response);

    } catch (ttsError) {
      console.error('[TTS] Synthesis error:', ttsError);
      sessionStore.updateStatus(sessionId, 'error', String(ttsError));

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'TTS_ERROR',
          message: ttsError instanceof Error ? ttsError.message : 'TTS failed'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(500).json(response);
    }

  } catch (error) {
    console.error('[TTS] Error:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/tts/providers
 * Get available TTS providers
 */
router.get('/providers', async (_req: Request, res: Response) => {
  const providers = [
    {
      id: 'minimax',
      name: 'Minimax TTS',
      description: 'High-quality Japanese TTS (40+ languages)',
      requiresApiKey: true,
      // New Minimax API only requires API key (no GroupID needed)
      configured: !!process.env.MINIMAX_API_KEY
    },
    {
      id: 'voicevox',
      name: 'VOICEVOX',
      description: 'Free local Japanese TTS engine',
      requiresApiKey: false,
      configured: true // Assumes VOICEVOX is running locally
    }
  ];

  const response: ApiResponse<typeof providers> = {
    success: true,
    data: providers,
    timestamp: new Date().toISOString()
  };

  return res.json(response);
});

export default router;
