/**
 * Upload Route - Handle file uploads and paper parsing
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sessionStore } from '../services/session-store.js';
import type { ApiResponse, ParsedPaperData } from '../types/index.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];

    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * POST /api/upload
 * Upload a paper and parse it
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', upload.single('file') as any, async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(response);
    }

    console.log(`[Upload] Received file: ${file.originalname} (${file.size} bytes)`);

    // Create a new session
    const session = sessionStore.create();
    sessionStore.updateStatus(session.id, 'parsing');

    try {
      // Import paper-parser dynamically
      const { PaperParser } = await import('@paper2galgame/paper-parser');
      const parser = new PaperParser();

      // Convert Node.js Buffer to ArrayBuffer properly
      // Create a new ArrayBuffer and copy data to avoid SharedArrayBuffer issues
      const arrayBuffer = new ArrayBuffer(file.buffer.byteLength);
      const view = new Uint8Array(arrayBuffer);
      view.set(new Uint8Array(file.buffer));

      // Parse the paper
      const result = await parser.parse(arrayBuffer, {
        filename: file.originalname,
        mimeType: file.mimetype
      });

      // Convert to our format - result is ParsedPaper with metadata
      const paperData: ParsedPaperData = {
        title: result.metadata?.title || 'Untitled Paper',
        authors: result.metadata?.authors || [],
        abstract: result.metadata?.abstract || '',
        sections: result.sections?.map((s: { title?: string; content?: string; type?: string }) => ({
          title: s.title || '',
          content: s.content || '',
          type: s.type || 'body'
        })) || [],
        rawText: result.rawText || '',
        metadata: {
          language: result.metadata?.language || result.stats?.detectedLanguage,
          wordCount: result.stats?.wordCount || result.rawText?.split(/\s+/).length || 0,
          parseTime: new Date().toISOString()
        }
      };

      sessionStore.setPaperData(session.id, paperData);

      console.log(`[Upload] Parsed paper: ${paperData.title} (${paperData.sections.length} sections)`);

      const response: ApiResponse<{
        sessionId: string;
        paper: {
          title: string;
          authors: string[];
          abstract: string;
          sectionCount: number;
          wordCount: number;
        };
      }> = {
        success: true,
        data: {
          sessionId: session.id,
          paper: {
            title: paperData.title,
            authors: paperData.authors,
            abstract: paperData.abstract.substring(0, 500) + (paperData.abstract.length > 500 ? '...' : ''),
            sectionCount: paperData.sections.length,
            wordCount: paperData.metadata.wordCount as number
          }
        },
        timestamp: new Date().toISOString()
      };

      return res.json(response);

    } catch (parseError) {
      console.error('[Upload] Parse error:', parseError);
      sessionStore.updateStatus(session.id, 'error', String(parseError));

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Failed to parse paper: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        },
        timestamp: new Date().toISOString()
      };
      return res.status(500).json(response);
    }

  } catch (error) {
    console.error('[Upload] Error:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Upload failed'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(500).json(response);
  }
});

/**
 * GET /api/upload/supported
 * Get supported file types
 */
router.get('/supported', async (_req: Request, res: Response) => {
  try {
    const { getSupportedTypes } = await import('@paper2galgame/paper-parser');
    const types = getSupportedTypes();

    const response: ApiResponse<typeof types> = {
      success: true,
      data: types,
      timestamp: new Date().toISOString()
    };

    return res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ERROR',
        message: 'Failed to get supported types'
      },
      timestamp: new Date().toISOString()
    };
    return res.status(500).json(response);
  }
});

export default router;
