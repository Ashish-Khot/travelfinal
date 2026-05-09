const AIService = require('./aiService');
const API_CONFIG = require('../config/apiConfig');

class GeminiService {
  constructor() {
    this.aiService = new AIService();
    this.providerSequence = this.resolveProviderSequence();
  }

  resolveProviderSequence() {
    const allowed = new Set(['gemini', 'openrouter', 'openai', 'groq']);
    const configuredDefault = String(API_CONFIG.AI?.PROVIDER || '').trim().toLowerCase();
    const configuredSequence = String(API_CONFIG.AI?.PROVIDER_SEQUENCE || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const fallbackOrder = ['gemini', 'openrouter', 'openai', 'groq'];
    const ordered = (configuredSequence.length ? configuredSequence : fallbackOrder)
      .filter((provider, index, list) => allowed.has(provider) && list.indexOf(provider) === index);

    if (configuredDefault && allowed.has(configuredDefault)) {
      return [configuredDefault, ...ordered.filter((provider) => provider !== configuredDefault)];
    }

    return ordered.length ? ordered : fallbackOrder;
  }

  parseStructuredJson(content) {
    const text = typeof content === 'string' ? content.trim() : '';
    const jsonBlock = this.aiService.extractJsonBlock(text, text);
    if (!jsonBlock || typeof jsonBlock !== 'string') {
      throw new Error('AI provider returned empty content.');
    }
    return JSON.parse(jsonBlock);
  }

  async callProvider(provider, { prompt, maxOutputTokens, temperature, attempt = 1 }) {
    if (provider === 'gemini') {
      return this.aiService.callGemini({
        prompt,
        model: 'gemini-2.5-flash',
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        thinkingBudget: 0,
        timeoutMs: 45000,
      });
    }

    if (provider === 'openrouter') {
      return this.aiService.callOpenRouterChat({
        prompt,
        temperature: Math.min(temperature, 0.15),
        maxTokens: Math.max(1800, Math.min(maxOutputTokens, 4200)),
        responseFormat: 'json_object',
      });
    }

    if (provider === 'openai') {
      return this.aiService.callOpenAIResponse({
        prompt,
        temperature: Math.min(temperature, 0.35),
        maxOutputTokens,
        responseFormat: 'json_object',
      });
    }

    if (provider === 'groq') {
      return this.aiService.callGroqChat({
        prompt,
        temperature: Math.min(temperature, 0.35),
        maxTokens: Math.max(1800, Math.min(maxOutputTokens, 4200)),
        responseFormat: 'json_object',
      });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  async generateStructuredJson({ prompt, maxOutputTokens = 2600, temperature = 0.4 }) {
    const errors = [];

    for (const provider of this.providerSequence) {
      const maxAttempts = provider === 'openrouter' ? 1 : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await this.callProvider(provider, {
            prompt,
            maxOutputTokens,
            temperature,
            attempt,
          });
          return this.parseStructuredJson(response);
        } catch (error) {
          errors.push(`[${provider}#${attempt}] ${error.message}`);
        }
      }
    }

    throw new Error(`All structured AI providers failed: ${errors.join(' | ')}`);
  }
}

module.exports = GeminiService;
