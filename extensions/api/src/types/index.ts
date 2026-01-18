/**
 * API Types for Paper2GalGame
 */

export interface Session {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
  paper?: ParsedPaperData;
  script?: GeneratedScriptData;
  audio?: AudioData;
  error?: string;
}

export type SessionStatus =
  | 'created'
  | 'uploading'
  | 'parsing'
  | 'parsed'
  | 'generating'
  | 'generated'
  | 'synthesizing'
  | 'ready'
  | 'error';

export interface ParsedPaperData {
  title: string;
  authors: string[];
  abstract: string;
  sections: Array<{
    title: string;
    content: string;
    type: string;
  }>;
  rawText: string;
  metadata: Record<string, unknown>;
}

export interface GeneratedScriptData {
  dialogues: Array<{
    id: string;
    character: string;
    text: string;
    textJp?: string;
    textEn?: string;
    emotion?: string;
  }>;
  webgalScript: string;
  metadata: {
    totalDialogues: number;
    characters: string[];
    estimatedDuration: number;
  };
}

export interface AudioData {
  files: Array<{
    dialogueId: string;
    filename: string;
    url: string;
    duration: number;
  }>;
  totalDuration: number;
}

export interface UploadRequest {
  file: Express.Multer.File;
}

export interface GenerateRequest {
  sessionId: string;
  characters: string[];
  language?: 'zh' | 'jp' | 'en';
  style?: 'educational' | 'casual' | 'formal';
}

export interface TTSRequest {
  sessionId: string;
  provider?: 'minimax' | 'voicevox';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface ProgressEvent {
  sessionId: string;
  status: SessionStatus;
  progress: number;
  message: string;
  data?: unknown;
}
