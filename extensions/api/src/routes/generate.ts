/**
 * Generate Route - Handle script generation with AI
 */

import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store.js';
import type { ApiResponse, GeneratedScriptData, GenerateRequest } from '../types/index.js';

const router = Router();

/**
 * POST /api/generate
 * Generate WebGAL script from parsed paper
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, characters, language = 'zh', style = 'educational' } = req.body as GenerateRequest;

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

    if (!characters || characters.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_CHARACTERS',
          message: 'At least one character must be selected'
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

    if (!session.paper) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_PAPER',
          message: 'Paper not uploaded yet'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    console.log(`[Generate] Starting generation for session ${sessionId}`);
    console.log(`[Generate] Characters: ${characters.join(', ')}, Language: ${language}`);

    sessionStore.updateStatus(sessionId, 'generating');

    try {
      // Import script generator
      const { PaperScriptGenerator, CHARACTER_CONFIGS } = await import('@paper2galgame/script-generator');

      // Validate API key
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
      }

      const generator = new PaperScriptGenerator(apiKey);

      // Validate characters - CHARACTER_CONFIGS is a Record<string, Character>
      const validCharacters = characters.filter((c: string) =>
        Object.keys(CHARACTER_CONFIGS).includes(c)
      );

      if (validCharacters.length === 0) {
        throw new Error('No valid characters selected');
      }

      // Prepare paper data for generator
      const paperData = {
        metadata: {
          title: session.paper.title,
          authors: session.paper.authors,
          abstract: session.paper.abstract,
          keywords: []
        },
        sections: session.paper.sections.map(s => ({
          type: s.type as 'abstract' | 'introduction' | 'methods' | 'results' | 'discussion' | 'conclusion' | 'references' | 'other',
          title: s.title,
          content: s.content,
          level: 1,
          position: 0
        })),
        rawText: session.paper.rawText,
        references: [],
        stats: {
          pageCount: 1,
          wordCount: session.paper.metadata.wordCount || 0,
          charCount: session.paper.rawText?.length || 0,
          sectionCount: session.paper.sections.length,
          figureCount: 0,
          tableCount: 0,
          equationCount: 0,
          citationCount: 0,
          processingTimeMs: 0,
          confidence: 1
        },
        timestamp: new Date(),
        parserVersion: '1.0.0',
        sourceFile: {
          name: 'uploaded.pdf',
          size: 0,
          type: 'application/pdf'
        }
      };

      // Generate script with multi-language support
      const result = await generator.generateValidatedScript(paperData, {
        characters: validCharacters,
        multiLanguage: {
          generateAll: true,
          primaryLanguage: language === 'jp' ? 'jp' : language === 'en' ? 'en' : 'zh',
          qualityThreshold: 0.8,
          verifyTranslations: true
        },
        style: {
          educationalWeight: style === 'educational' ? 0.8 : 0.5,
          complexity: 'intermediate' as const,
          interactive: true,
          audience: 'general' as const
        },
        content: {
          includeMethodology: true,
          includeResults: true,
          includeConclusions: true
        },
        voice: {
          generateVoice: true,
          provider: 'minimax' as const
        }
      });

      if (!result.success || !result.script) {
        throw new Error(result.error || 'Script generation failed');
      }

      // Extract dialogues from scenes
      const dialogues: GeneratedScriptData['dialogues'] = [];
      let dialogueIndex = 0;

      for (const scene of result.script.scenes || []) {
        for (const line of scene.lines || []) {
          if (line.command === 'say') {
            const rawContent = line.params[0] || '';

            // Extract speaker from -speaker= option in content
            let speakerName = 'unknown';
            const speakerMatch = rawContent.match(/-speaker=(\w+)/);
            if (speakerMatch) {
              speakerName = speakerMatch[1];
            } else if (line.options?.speaker) {
              const speaker = line.options.speaker;
              speakerName = typeof speaker === 'string' ? speaker : 'unknown';
            }

            // Extract text content (before -speaker option)
            let textContent = rawContent;
            const optionIndex = rawContent.indexOf(' -speaker=');
            if (optionIndex > 0) {
              textContent = rawContent.substring(0, optionIndex);
            }

            dialogues.push({
              id: `dialogue_${dialogueIndex++}`,
              character: speakerName,
              text: textContent,
              textJp: textContent,
              textEn: '',
              emotion: 'normal'
            });
          }
        }
      }

      // Generate WebGAL format script
      const webgalLines: string[] = [];
      for (const scene of result.script.scenes || []) {
        for (const line of scene.lines || []) {
          if (line.raw) {
            webgalLines.push(line.raw);
          }
        }
      }

      const scriptData: GeneratedScriptData = {
        dialogues,
        webgalScript: webgalLines.join('\n'),
        metadata: {
          totalDialogues: dialogues.length,
          characters: validCharacters,
          estimatedDuration: Math.ceil(dialogues.length * 5)
        }
      };

      sessionStore.setScriptData(sessionId, scriptData);

      console.log(`[Generate] Generated ${scriptData.dialogues.length} dialogues`);

      const response: ApiResponse<{
        sessionId: string;
        script: {
          totalDialogues: number;
          characters: string[];
          estimatedDuration: number;
          preview: Array<{
            character: string;
            text: string;
          }>;
        };
      }> = {
        success: true,
        data: {
          sessionId,
          script: {
            totalDialogues: scriptData.metadata.totalDialogues,
            characters: scriptData.metadata.characters,
            estimatedDuration: scriptData.metadata.estimatedDuration,
            preview: scriptData.dialogues.slice(0, 5).map(d => ({
              character: d.character,
              text: d.text.substring(0, 100) + (d.text.length > 100 ? '...' : '')
            }))
          }
        },
        timestamp: new Date().toISOString()
      };

      return res.json(response);

    } catch (genError) {
      console.error('[Generate] Generation error:', genError);
      sessionStore.updateStatus(sessionId, 'error', String(genError));

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: genError instanceof Error ? genError.message : 'Generation failed'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(500).json(response);
    }

  } catch (error) {
    console.error('[Generate] Error:', error);

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
 * GET /api/generate/script/:sessionId
 * Get generated WebGAL script for a session
 */
router.get('/script/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

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

    const response: ApiResponse<{
      script: string;
      metadata: {
        totalDialogues: number;
        characters: string[];
        estimatedDuration: number;
      };
    }> = {
      success: true,
      data: {
        script: session.script.webgalScript,
        metadata: session.script.metadata
      },
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
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
 * GET /api/generate/characters
 * Get available characters
 */
router.get('/characters', async (_req: Request, res: Response) => {
  try {
    const { CHARACTER_CONFIGS } = await import('@paper2galgame/script-generator');

    const characters = Object.values(CHARACTER_CONFIGS).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.paperRole,
      personality: c.personality,
      sprite: c.sprite
    }));

    const response: ApiResponse<typeof characters> = {
      success: true,
      data: characters,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: 'Failed to get characters'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(500).json(response);
  }
});

export default router;
