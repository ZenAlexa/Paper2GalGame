/**
 * Session Route - Handle session status and management
 */

import { Router, Request, Response } from 'express';
import { sessionStore } from '../services/session-store.js';
import type { ApiResponse, Session } from '../types/index.js';

const router = Router();

/**
 * GET /api/session/:id
 * Get session status and data
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = sessionStore.get(id);

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

    // Build response with available data
    const sessionData: Partial<Session> & { id: string; status: string } = {
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    // Include paper info if available
    if (session.paper) {
      sessionData.paper = {
        title: session.paper.title,
        authors: session.paper.authors,
        abstract: session.paper.abstract.substring(0, 200) + '...',
        sections: session.paper.sections.map(s => ({ title: s.title, type: s.type, content: '' })),
        rawText: '',
        metadata: session.paper.metadata
      };
    }

    // Include script info if available
    if (session.script) {
      sessionData.script = {
        dialogues: [],
        webgalScript: '',
        metadata: session.script.metadata
      };
    }

    // Include audio info if available
    if (session.audio) {
      sessionData.audio = session.audio;
    }

    // Include error if any
    if (session.error) {
      (sessionData as any).error = session.error;
    }

    const response: ApiResponse<typeof sessionData> = {
      success: true,
      data: sessionData,
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
 * GET /api/session/:id/script
 * Get the full WebGAL script for playback
 */
router.get('/:id/script', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = sessionStore.get(id);

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
      webgalScript: string;
      dialogues: typeof session.script.dialogues;
      metadata: typeof session.script.metadata;
    }> = {
      success: true,
      data: {
        webgalScript: session.script.webgalScript,
        dialogues: session.script.dialogues,
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
 * DELETE /api/session/:id
 * Delete a session
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = sessionStore.delete(id);

    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found'
        },
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
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

export default router;
