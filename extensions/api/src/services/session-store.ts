/**
 * In-memory session store for Paper2GalGame API
 *
 * Stores session data during processing. Data is temporary
 * and will be cleared when the server restarts.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Session, SessionStatus, ParsedPaperData, GeneratedScriptData, AudioData } from '../types/index.js';

class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private readonly maxAge = 1000 * 60 * 60; // 1 hour

  /**
   * Create a new session
   */
  create(): Session {
    const session: Session = {
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'created'
    };
    this.sessions.set(session.id, session);
    this.cleanup();
    return session;
  }

  /**
   * Get a session by ID
   */
  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  /**
   * Update session status
   */
  updateStatus(id: string, status: SessionStatus, error?: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.status = status;
      session.updatedAt = new Date();
      if (error) {
        session.error = error;
      }
    }
    return session;
  }

  /**
   * Store parsed paper data
   */
  setPaperData(id: string, paper: ParsedPaperData): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.paper = paper;
      session.status = 'parsed';
      session.updatedAt = new Date();
    }
    return session;
  }

  /**
   * Store generated script data
   */
  setScriptData(id: string, script: GeneratedScriptData): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.script = script;
      session.status = 'generated';
      session.updatedAt = new Date();
    }
    return session;
  }

  /**
   * Store audio data
   */
  setAudioData(id: string, audio: AudioData): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.audio = audio;
      session.status = 'ready';
      session.updatedAt = new Date();
    }
    return session;
  }

  /**
   * Delete a session
   */
  delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  /**
   * Get all sessions (for debugging)
   */
  getAll(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.createdAt.getTime() > this.maxAge) {
        this.sessions.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();
export default sessionStore;
