import { Injectable } from '@nestjs/common';

export type OrchestratedIntent = 'KNOWLEDGE' | 'LIVE_DATA' | 'ACTION' | 'MIXED' | 'UNKNOWN';

@Injectable()
export class AiOrchestratorService {
  classify(message: string): OrchestratedIntent {
    const value = message.toLowerCase();
    const action = /\b(create|update|delete|assign|add|move|vote|send)\b/.test(value);
    const live = /\b(show|get|search|list|status|how many|check)\b/.test(value);
    const knowledge = /\b(how|what|why|where|explain|help|policy|docs?)\b/.test(value);
    if ((action || live) && knowledge) return 'MIXED';
    if (action) return 'ACTION';
    if (live) return 'LIVE_DATA';
    if (knowledge) return 'KNOWLEDGE';
    return 'UNKNOWN';
  }
}
