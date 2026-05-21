import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.getOrThrow<string>('OPENAI_API_KEY') });
    this.model = config.get<string>('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small');
  }

  async embed(text: string): Promise<number[]> {
    const input = text.replace(/\s+/g, ' ').trim();
    let lastError: unknown;

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        const response = await this.client.embeddings.create({
          model: this.model,
          input,
        });
        return response.data[0].embedding;
      } catch (error) {
        lastError = error;
        if (!isRetryableOpenAiError(error) || attempt === 6) break;
        await sleep(getRetryDelayMs(error, attempt));
      }
    }

    throw lastError;
  }

  chunk(text: string, maxChars = 2600, overlap = 250) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    if (maxChars <= 0) throw new Error('maxChars must be greater than zero.');

    const step = overlap >= maxChars ? maxChars : maxChars - Math.max(overlap, 0);
    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < normalized.length) {
      const end = Math.min(cursor + maxChars, normalized.length);
      chunks.push(normalized.slice(cursor, end));
      if (end >= normalized.length) break;
      cursor += step;
    }

    return chunks.filter(Boolean);
  }

  getModel() {
    return this.model;
  }
}

function isRetryableOpenAiError(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined;
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getRetryDelayMs(error: unknown, attempt: number) {
  const message = error instanceof Error ? error.message : String(error);
  const retryMatch = message.match(/try again in (\d+)ms/i);
  if (retryMatch) return Number(retryMatch[1]) + 500;
  return Math.min(1000 * 2 ** (attempt - 1), 10000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
