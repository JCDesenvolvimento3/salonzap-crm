import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenRouterRequest = {
  messages: OpenRouterMessage[];
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;
  metadata?: Record<string, string>;
};

type OpenRouterResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: Record<string, unknown>;
};

@Injectable()
export class OpenRouterService {
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  getDefaultModel() {
    return (
      this.configService.get<string>('OPENROUTER_MODEL')?.trim() ||
      'deepseek/deepseek-v4-flash:free'
    );
  }

  private getApiKey() {
    return this.configService.get<string>('OPENROUTER_API_KEY')?.trim() || '';
  }

  private getAppReferer() {
    return (
      this.configService.get<string>('OPENROUTER_HTTP_REFERER')?.trim() ||
      this.configService.get<string>('NEXT_PUBLIC_SITE_URL')?.trim() ||
      'https://salonzap-crm-web.vercel.app'
    );
  }

  async createJsonCompletion({
    messages,
    maxTokens = 500,
    temperature = 0.4,
    sessionId,
    metadata,
  }: OpenRouterRequest) {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.getAppReferer(),
        'X-OpenRouter-Title': 'SalonZap CRM',
      },
      body: JSON.stringify({
        model: this.getDefaultModel(),
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: {
          type: 'json_object',
        },
        ...(sessionId ? { session_id: sessionId } : {}),
        ...(metadata ? { metadata } : {}),
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? ((await response.json()) as OpenRouterResponse)
      : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      throw new Error(
        `OpenRouter request failed with status ${response.status}: ${message}`,
      );
    }

    const completion = payload as OpenRouterResponse;
    const content = completion.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      throw new Error('OpenRouter returned an empty completion.');
    }

    return {
      model: completion.model || this.getDefaultModel(),
      content,
      payload: completion,
    };
  }
}
