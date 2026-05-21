import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { SearchResult, VectorSearchService } from '../vector-search/vector-search.service';

export type RagAnswerChunk =
  | { type: 'sources'; sources: SearchResult[] }
  | { type: 'delta'; delta: string }
  | { type: 'done' };

export type RagHistoryMessage = {
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL';
  content: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI;
  private readonly chatModel: string;

  constructor(
    private readonly embeddings: EmbeddingsService,
    private readonly vectorSearch: VectorSearchService,
    config: ConfigService,
  ) {
    this.client = new OpenAI({ apiKey: config.getOrThrow<string>('OPENAI_API_KEY') });
    this.chatModel = config.get<string>('OPENAI_CHAT_MODEL', 'gpt-4.1-mini');
  }

  async *streamRagAnswer(tenantId: string, question: string, history: RagHistoryMessage[] = []): AsyncGenerator<RagAnswerChunk> {
    const startedAt = Date.now();
    this.logger.log(
      `RAG answer requested ${JSON.stringify({
        tenantId,
        questionLength: question.length,
        chatModel: this.chatModel,
      })}`,
    );

    const questionEmbedding = await this.embeddings.embed(question);
    this.logger.log(
      `Question embedding generated ${JSON.stringify({
        tenantId,
        dimensions: questionEmbedding.length,
      })}`,
    );

    const sources = await this.vectorSearch.search(tenantId, questionEmbedding, 6);
    this.logger.log(
      `Vector search completed ${JSON.stringify({
        tenantId,
        sources: sources.length,
      })}`,
    );
    yield { type: 'sources', sources };

    const context = sources
      .map((source, index) => `[${index + 1}] ${source.title}\nURL: ${source.uri}\n${source.content}`)
      .join('\n\n---\n\n');

    const stream = await this.client.chat.completions.create({
      model: this.chatModel,
      stream: true,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'You are a tenant-isolated knowledge base assistant. Answer only from the provided context. If the answer is not present, say exactly: "I could not find this information in the knowledge base." Mention source numbers when useful. Never invent facts.',
        },
        ...history.slice(-20).map((message) => ({
          role: message.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
          content: message.content,
        })),
        {
          role: 'user',
          content: `Context:\n${context || 'No matching knowledge base context.'}\n\nQuestion: ${question}`,
        },
      ],
    });

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) yield { type: 'delta', delta };
    }
    this.logger.log(
      `RAG answer stream completed ${JSON.stringify({
        tenantId,
        durationMs: Date.now() - startedAt,
      })}`,
    );
    yield { type: 'done' };
  }

  async generateChatTitle(messages: RagHistoryMessage[]) {
    const conversation = messages
      .slice(0, 6)
      .map((message) => `${message.role === 'ASSISTANT' ? 'Assistant' : 'User'}: ${message.content}`)
      .join('\n');

    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Generate a short, clear title for this chat based on the conversation.\n\nRules:\n- 3 to 7 words\n- No quotes\n- No emojis\n- Title case\n- Must describe the user main topic\n- Do not include generic words like "Chat" or "Conversation"\n\nReturn only the title.',
        },
        {
          role: 'user',
          content: `Conversation:\n${conversation}`,
        },
      ],
    });

    return sanitizeTitle(response.choices[0]?.message?.content || 'New Chat');
  }
}

function sanitizeTitle(value: string) {
  const cleaned = value.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean).slice(0, 7);
  return words.length >= 3 ? words.join(' ') : cleaned || 'New Chat';
}
