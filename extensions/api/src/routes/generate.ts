/**
 * Generate Route - Handle script generation with AI
 */

import { type Request, type Response, Router } from 'express';
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
          message: 'Session ID is required',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    if (!characters || characters.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_CHARACTERS',
          message: 'At least one character must be selected',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    const session = sessionStore.get(sessionId);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or expired',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    if (!session.paper) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_PAPER',
          message: 'Paper not uploaded yet',
        },
        timestamp: new Date().toISOString(),
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
      const validCharacters = characters.filter((c: string) => Object.keys(CHARACTER_CONFIGS).includes(c));

      if (validCharacters.length === 0) {
        throw new Error('No valid characters selected');
      }

      // Prepare paper data for generator
      const paperData = {
        metadata: {
          title: session.paper.title,
          authors: session.paper.authors,
          abstract: session.paper.abstract,
          keywords: [],
        },
        sections: session.paper.sections.map((s) => ({
          type: s.type as
            | 'abstract'
            | 'introduction'
            | 'methods'
            | 'results'
            | 'discussion'
            | 'conclusion'
            | 'references'
            | 'other',
          title: s.title,
          content: s.content,
          level: 1,
          position: 0,
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
          confidence: 1,
        },
        timestamp: new Date(),
        parserVersion: '1.0.0',
        sourceFile: {
          name: 'uploaded.pdf',
          size: 0,
          type: 'application/pdf',
        },
      };

      // Generate script with multi-language support
      const result = await generator.generateValidatedScript(paperData, {
        characters: validCharacters,
        multiLanguage: {
          generateAll: true,
          primaryLanguage: language === 'jp' ? 'jp' : language === 'en' ? 'en' : 'zh',
          qualityThreshold: 0.8,
          verifyTranslations: true,
        },
        style: {
          educationalWeight: style === 'educational' ? 0.8 : 0.5,
          complexity: 'intermediate' as const,
          interactive: true,
          audience: 'general' as const,
        },
        content: {
          includeMethodology: true,
          includeResults: true,
          includeConclusions: true,
        },
        voice: {
          generateVoice: true,
          provider: 'minimax' as const,
        },
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

            // Extract speaker from options first (preferred), then from content
            let speakerName = 'unknown';
            if (line.options?.speaker) {
              const speaker = line.options.speaker;
              speakerName = typeof speaker === 'string' ? speaker : 'unknown';
            } else {
              // Fallback: extract from content using robust regex
              const speakerMatch = rawContent.match(/-speaker=(\w+)/);
              if (speakerMatch) {
                speakerName = speakerMatch[1];
              }
            }

            // Extract text content by removing all WebGAL options
            // Handles various spacing: "text -speaker=x", "text-speaker=x", "text  -speaker=x"
            let textContent = rawContent
              .replace(/;$/, '') // Remove trailing semicolon
              .replace(/\s*-\w+=[^\s;]*/g, '') // Remove all -option=value patterns
              .trim();

            // If text is empty after extraction, use raw content without options
            if (!textContent && rawContent) {
              textContent = rawContent.split(/\s+-/)[0].replace(/;$/, '').trim();
            }

            dialogues.push({
              id: `dialogue_${dialogueIndex++}`,
              character: speakerName,
              text: textContent,
              textJp: textContent,
              textEn: '',
              emotion: 'normal',
            });
          }
        }
      }

      // Generate WebGAL format script with validation
      // CRITICAL: Reconstruct lines from validated params/options, NOT from raw
      const webgalLines: string[] = [];
      // Use lowercase for case-insensitive command matching
      const validCommands = [
        'changebg',
        'changefigure',
        'say',
        'bgm',
        'playbgm',
        'playse',
        'wait',
        'choose',
        'label',
        'end',
        'jump',
      ];

      // Map lowercase commands to proper camelCase for WebGAL
      const commandCaseMap: Record<string, string> = {
        changebg: 'changeBg',
        changefigure: 'changeFigure',
        say: 'say',
        bgm: 'bgm',
        playbgm: 'playBGM',
        playse: 'playSE',
        wait: 'wait',
        choose: 'choose',
        label: 'label',
        end: 'end',
        jump: 'jump',
      };

      // Helper to format options for WebGAL syntax
      const formatOptions = (options: Record<string, string | number | boolean> | undefined): string => {
        if (!options || Object.keys(options).length === 0) return '';
        return Object.entries(options)
          .map(([key, value]) => {
            if (typeof value === 'boolean' && value) return ` -${key}`;
            if (typeof value === 'string' || typeof value === 'number') return ` -${key}=${value}`;
            return '';
          })
          .filter(Boolean)
          .join('');
      };

      for (const scene of result.script.scenes || []) {
        for (const line of scene.lines || []) {
          const command = String(line.command || '').toLowerCase();

          // Validate command
          if (!validCommands.includes(command)) {
            console.warn(`[Generate] Skipping invalid command: ${command}`);
            continue;
          }

          // CRITICAL FIX: Reconstruct line from validated components
          // Use proper camelCase command for WebGAL
          const properCommand = commandCaseMap[command] || command;
          let reconstructedLine: string;

          if (command === 'say') {
            // For say commands, ensure we have content
            const content = line.params?.[0]?.trim();
            if (!content) {
              console.warn(`[Generate] Skipping empty say command`);
              continue;
            }

            // Reconstruct: say:content -speaker=xxx;
            const options = formatOptions(line.options);
            reconstructedLine = `${properCommand}:${content}${options};`;

            // Reduced logging for performance
          } else {
            // For other commands (changeBg, changeFigure, bgm, etc.)
            let content = line.params?.[0] || '';

            // CRITICAL: Remove position flags from content if they exist
            // AI sometimes includes -center/-left/-right in the content itself
            const positionFlags = ['-center', '-left', '-right', '-id='];
            for (const flag of positionFlags) {
              if (content.includes(flag)) {
                content = content.split(flag)[0].trim();
              }
            }

            const options = formatOptions(line.options);
            reconstructedLine = `${properCommand}:${content}${options};`;
            // Reduced logging for performance
          }

          webgalLines.push(reconstructedLine);
        }
      }

      // CRITICAL: Ensure script starts with changeBg command
      // Without this, the game will show no background
      const hasChangeBgAtStart = webgalLines.length > 0 && webgalLines[0].toLowerCase().startsWith('changebg:');

      if (!hasChangeBgAtStart) {
        console.log('[Generate] No changeBg at start, inserting default background');
        // Add -next so changeBg auto-advances to next command
        webgalLines.unshift('changeBg:bg.webp -next;');
      } else {
        // Ensure existing changeBg has -next flag
        if (!webgalLines[0].includes('-next')) {
          webgalLines[0] = webgalLines[0].replace(/;$/, ' -next;');
        }
      }

      // CRITICAL: Ensure only ONE bgm command at the start of the script
      // Multiple bgm commands or bgm in the middle causes audio restart issues
      // Remove all existing bgm commands first
      const bgmLines = webgalLines.filter((line) => line.toLowerCase().startsWith('bgm:'));
      const nonBgmLines = webgalLines.filter((line) => !line.toLowerCase().startsWith('bgm:'));

      // Determine which bgm to use (first found or default)
      let bgmCommand = 'bgm:s_Title.mp3 -volume=80;';
      if (bgmLines.length > 0) {
        // Use the first bgm command found, but ensure it has volume
        const firstBgm = bgmLines[0];
        if (!firstBgm.includes('-volume=')) {
          bgmCommand = `${firstBgm.replace(/;$/, '')} -volume=80;`;
        } else {
          bgmCommand = firstBgm;
        }
        console.log(`[Generate] Using existing bgm: ${bgmCommand}`);
      } else {
        console.log(`[Generate] No bgm found, inserting default: ${bgmCommand}`);
      }

      // Rebuild webgalLines with single bgm at position 1 (after changeBg)
      webgalLines.length = 0;
      webgalLines.push(nonBgmLines[0]); // changeBg at index 0
      webgalLines.push(bgmCommand); // bgm at index 1
      webgalLines.push(...nonBgmLines.slice(1)); // Rest of the script

      console.log(`[Generate] After BGM processing: ${webgalLines.length} lines`);

      // Speaker to sprite mapping (4 characters sharing 2 sprites)
      const speakerSpriteMap: Record<string, { sprite: string; position: string }> = {
        host: { sprite: 'stand.webp', position: '-center' }, // Main host, center
        energizer: { sprite: 'stand2.webp', position: '-right' }, // Energetic, right
        analyst: { sprite: 'stand.webp', position: '-left' }, // Analyst, left
        interpreter: { sprite: 'stand2.webp', position: '-right' }, // Interpreter, right
        // Fallback for unknown speakers
        unknown: { sprite: 'stand.webp', position: '-center' },
      };

      // CRITICAL: Insert changeFigure commands when speaker changes
      // This ensures the correct character sprite is shown for each dialogue
      // First, REMOVE all existing changeFigure commands to avoid duplicates
      // (AI may have already generated them, but we want consistent speaker-based logic)
      const linesWithoutFigures = webgalLines.filter((line) => !line.toLowerCase().startsWith('changefigure:'));
      console.log(
        `[Generate] Removed ${webgalLines.length - linesWithoutFigures.length} existing changeFigure commands`
      );

      const processedLines: string[] = [];
      let currentSpeaker: string | null = null;

      for (const line of linesWithoutFigures) {
        const lowerLine = line.toLowerCase();

        // Check if this is a say command
        if (lowerLine.startsWith('say:')) {
          // Extract speaker from the say command
          const speakerMatch = line.match(/-speaker=(\w+)/i);
          const speaker = speakerMatch ? speakerMatch[1].toLowerCase() : 'unknown';

          // If speaker changed, insert changeFigure command with -next flag
          // -next makes changeFigure auto-advance to the next sentence
          if (speaker !== currentSpeaker) {
            const spriteConfig = speakerSpriteMap[speaker] || speakerSpriteMap.unknown;
            const changeFigureLine = `changeFigure:${spriteConfig.sprite} ${spriteConfig.position} -next;`;

            // Note: Speaker changed, figure inserted (logging reduced for performance)
            processedLines.push(changeFigureLine);
            currentSpeaker = speaker;
          }
        }

        processedLines.push(line);
      }

      // Replace webgalLines with processed version
      webgalLines.length = 0;
      webgalLines.push(...processedLines);

      console.log(`[Generate] After speaker processing: ${webgalLines.length} lines`);

      // Note: Full script logging removed for performance
      // Debug with first 5 lines only
      console.log(`[Generate] Reconstructed ${webgalLines.length} WebGAL lines`);
      if (webgalLines.length > 0) {
        console.log(`[Generate] First line: ${webgalLines[0]}`);
        console.log(`[Generate] Last line: ${webgalLines[webgalLines.length - 1]}`);
      }

      // Ensure we have at least some valid content
      if (webgalLines.length === 0) {
        throw new Error('Generated script contains no valid WebGAL commands');
      }

      const scriptData: GeneratedScriptData = {
        dialogues,
        webgalScript: webgalLines.join('\n'),
        metadata: {
          totalDialogues: dialogues.length,
          characters: validCharacters,
          estimatedDuration: Math.ceil(dialogues.length * 5),
        },
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
            preview: scriptData.dialogues.slice(0, 5).map((d) => ({
              character: d.character,
              text: d.text.substring(0, 100) + (d.text.length > 100 ? '...' : ''),
            })),
          },
        },
        timestamp: new Date().toISOString(),
      };

      return res.json(response);
    } catch (genError) {
      console.error('[Generate] Generation error:', genError);
      sessionStore.updateStatus(sessionId, 'error', String(genError));

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GENERATION_ERROR',
          message: genError instanceof Error ? genError.message : 'Generation failed',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(500).json(response);
    }
  } catch (error) {
    console.error('[Generate] Error:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
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
          message: 'Session not found or expired',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    if (!session.script) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_SCRIPT',
          message: 'Script not generated yet',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    // CRITICAL: Inject vocal parameters if audio data exists
    // This connects TTS-generated audio files to the WebGAL script
    let finalScript = session.script.webgalScript;

    if (session.audio && session.audio.files.length > 0) {
      console.log(`[Generate/Script] Injecting ${session.audio.files.length} vocal parameters`);

      // Build dialogue ID to vocal URL map
      const vocalMap = new Map<string, string>();
      for (const file of session.audio.files) {
        vocalMap.set(file.dialogueId, file.url);
      }

      // Process each line and inject vocal parameter
      const lines = finalScript.split('\n');
      const processedLines: string[] = [];
      let dialogueIndex = 0;

      for (const line of lines) {
        if (line.toLowerCase().startsWith('say:') && !line.includes('-vocal=')) {
          // Find the vocal URL for this dialogue
          const dialogueId = `dialogue_${dialogueIndex}`;
          const vocalUrl = vocalMap.get(dialogueId);

          if (vocalUrl) {
            // Inject vocal parameter before the semicolon
            const vocalParam = ` -vocal=${vocalUrl}`;
            const processedLine = line.replace(/;$/, `${vocalParam};`);
            processedLines.push(processedLine);
            console.log(`[Generate/Script] Injected vocal for ${dialogueId}: ${vocalUrl}`);
          } else {
            processedLines.push(line);
          }
          dialogueIndex++;
        } else {
          processedLines.push(line);
        }
      }

      finalScript = processedLines.join('\n');
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
        script: finalScript,
        metadata: session.script.metadata,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/generate/structured/:sessionId
 * Get structured AIGeneratedScript data for deep WebGAL integration
 * This returns data in a format that PaperSceneBuilder can use directly
 */
router.get('/structured/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = sessionStore.get(sessionId);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or expired',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    if (!session.script) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_SCRIPT',
          message: 'Script not generated yet',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(400).json(response);
    }

    // Build AIGeneratedScript format for PaperSceneBuilder
    // Convert dialogues to AIDialogueLine format
    const dialogues = session.script.dialogues.map((d, index) => {
      // Map character names to character IDs
      const characterId = d.character.toLowerCase();

      // Get vocal URL if TTS was generated
      let vocal: string | undefined;
      if (session.audio?.files) {
        const audioFile = session.audio.files.find((f) => f.dialogueId === d.id);
        if (audioFile) {
          vocal = audioFile.url;
        }
      }

      return {
        characterId,
        text: d.text,
        emotion: d.emotion || 'neutral',
        vocal,
        index,
      };
    });

    // AIGeneratedScript structure matching packages/webgal/src/Paper/types/dialogue.ts
    const aiGeneratedScript = {
      metadata: {
        paperTitle: session.paper?.title || 'Unknown Paper',
        characters: session.script.metadata.characters,
        totalLines: dialogues.length,
        estimatedDuration: session.script.metadata.estimatedDuration,
        generatedAt: new Date().toISOString(),
      },
      dialogues,
      background: 'bg.webp', // Default background
      bgm: 's_Title.mp3', // Default BGM
      bgmVolume: 80,
    };

    console.log(`[Generate/Structured] Returning AIGeneratedScript for session ${sessionId}`);
    console.log(
      `[Generate/Structured] ${dialogues.length} dialogues, ${session.script.metadata.characters.length} characters`
    );

    const response: ApiResponse<typeof aiGeneratedScript> = {
      success: true,
      data: aiGeneratedScript,
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (error) {
    console.error('[Generate/Structured] Error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/generate/audio/:sessionId
 * Get audio data for a session (vocal map for TTS integration)
 * Returns the mapping of dialogue IDs to audio URLs
 */
router.get('/audio/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = sessionStore.get(sessionId);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found or expired',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    if (!session.audio?.files || session.audio.files.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_AUDIO',
          message: 'No audio generated for this session',
        },
        timestamp: new Date().toISOString(),
      };
      return res.status(404).json(response);
    }

    // Build vocal map: dialogueId -> URL
    const vocalMap: Record<string, string> = {};
    for (const file of session.audio.files) {
      vocalMap[file.dialogueId] = file.url;
    }

    console.log(`[Generate/Audio] Returning ${Object.keys(vocalMap).length} audio URLs for session ${sessionId}`);

    const response: ApiResponse<{
      files: typeof session.audio.files;
      totalDuration: number;
      vocalMap: Record<string, string>;
    }> = {
      success: true,
      data: {
        files: session.audio.files,
        totalDuration: session.audio.totalDuration,
        vocalMap,
      },
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (error) {
    console.error('[Generate/Audio] Error:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
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
      sprite: c.sprite,
    }));

    const response: ApiResponse<typeof characters> = {
      success: true,
      data: characters,
      timestamp: new Date().toISOString(),
    };

    return res.json(response);
  } catch (_error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: 'Failed to get characters',
      },
      timestamp: new Date().toISOString(),
    };
    return res.status(500).json(response);
  }
});

export default router;
