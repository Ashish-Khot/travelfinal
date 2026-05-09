const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class AIService {
  constructor() {
    this.geminiKey = (API_CONFIG.GEMINI?.API_KEY || '').trim();
    this.geminiBaseUrl =
      API_CONFIG.GEMINI?.BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta';
    this.geminiModel = API_CONFIG.GEMINI?.MODEL || 'gemini-2.5-flash';
    this.geminiVisionModel =
      API_CONFIG.GEMINI?.VISION_MODEL || this.geminiModel;
    this.hasGeminiAccess = Boolean(this.geminiKey);

    this.openaiKey = (API_CONFIG.OPENAI?.API_KEY || '').trim();
    this.openaiBaseUrl = API_CONFIG.OPENAI?.BASE_URL || 'https://api.openai.com/v1';
    this.openaiModel = API_CONFIG.OPENAI?.MODEL || 'gpt-oss-120b';
    this.openaiMaxOutputTokens = Number(API_CONFIG.OPENAI?.MAX_OUTPUT_TOKENS || 7000);
    this.hasOpenAIAccess = Boolean(this.openaiKey);

    this.openRouterKey = (API_CONFIG.OPENROUTER?.API_KEY || '').trim();
    this.openRouterBaseUrl = API_CONFIG.OPENROUTER?.BASE_URL || 'https://openrouter.ai/api/v1';
    this.openRouterModel = API_CONFIG.OPENROUTER?.MODEL || 'openrouter/free';
    this.hasOpenRouterAccess = Boolean(this.openRouterKey);

    this.groqKey = (API_CONFIG.GROQ?.API_KEY || '').trim();
    this.groqBaseUrl = API_CONFIG.GROQ?.BASE_URL || 'https://api.groq.com/openai/v1';
    this.groqModel = API_CONFIG.GROQ?.MODEL || 'llama-3.1-8b-instant';
    this.hasGroqAccess = Boolean(this.groqKey);
  }

  extractJsonBlock(content, fallback = null) {
    if (!content || typeof content !== 'string') return fallback;
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) return objectMatch[0];
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0];
    return fallback;
  }

  normalizeImagePayload(imageData, imageMimeType) {
    if (!imageData || typeof imageData !== 'string') return null;

    let data = imageData.trim();
    let mimeType = imageMimeType;
    const dataUrlMatch = data.match(/^data:(.+?);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = mimeType || dataUrlMatch[1];
      data = dataUrlMatch[2];
    }

    data = data.replace(/\s/g, '');
    return {
      data,
      mimeType: mimeType || 'image/jpeg',
    };
  }

  extractOpenAIOutputText(responseData) {
    if (!responseData) return '';
    if (typeof responseData.output_text === 'string') {
      return responseData.output_text.trim();
    }

    const output = Array.isArray(responseData.output) ? responseData.output : [];
    const chunks = [];

    output.forEach((item) => {
      if (item?.type !== 'message') return;
      const content = Array.isArray(item.content) ? item.content : [];
      content.forEach((part) => {
        if (part?.type === 'output_text' && part.text) {
          chunks.push(part.text);
        }
      });
    });

    return chunks.join('').trim();
  }

  async callGemini({
    prompt,
    imageData,
    imageMimeType,
    model,
    temperature = 0.7,
    maxOutputTokens = 1200,
    responseMimeType,
    thinkingBudget,
    timeoutMs,
  }) {
    if (!this.hasGeminiAccess) {
      throw new Error('Gemini API key is missing');
    }

    const parts = [{ text: prompt }];
    if (imageData) {
      const normalized = this.normalizeImagePayload(imageData, imageMimeType);
      if (normalized?.data) {
        parts.push({
          inline_data: {
            mime_type: normalized.mimeType,
            data: normalized.data,
          },
        });
      }
    }

    const generationConfig = {
      temperature,
      maxOutputTokens,
    };
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }
    if (Number.isFinite(Number(thinkingBudget)) && Number(thinkingBudget) >= 0) {
      generationConfig.thinkingConfig = {
        thinkingBudget: Math.floor(Number(thinkingBudget)),
      };
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig,
    };

    const modelName = model || this.geminiModel;
    const url = `${this.geminiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent?key=${this.geminiKey}`;

    const response = await axios.post(url, requestBody, {
      timeout: Number(timeoutMs) > 0 ? Number(timeoutMs) : API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    const partsOut = response.data?.candidates?.[0]?.content?.parts || [];
    return partsOut.map((part) => part.text || '').join('').trim();
  }

  async callOpenAIResponse({
    prompt,
    temperature = 0.7,
    maxOutputTokens,
    responseFormat = 'json_object',
  }) {
    if (!this.hasOpenAIAccess) {
      throw new Error('OpenAI API key is missing');
    }

    const input = [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Respond with valid JSON only.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
        ],
      },
    ];

    const requestBody = {
      model: this.openaiModel,
      input,
      temperature,
      max_output_tokens: Number.isFinite(maxOutputTokens)
        ? maxOutputTokens
        : this.openaiMaxOutputTokens,
    };

    if (responseFormat) {
      requestBody.text = { format: { type: responseFormat } };
    }

    const response = await axios.post(
      `${this.openaiBaseUrl}/responses`,
      requestBody,
      {
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        headers: {
          Authorization: `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return this.extractOpenAIOutputText(response.data);
  }

  async callOpenRouterChat({
    prompt,
    model,
    temperature = 0.3,
    maxTokens = 2200,
    responseFormat = 'json_object',
  }) {
    if (!this.hasOpenRouterAccess) {
      throw new Error('OpenRouter API key is missing');
    }

    const requestBody = {
      model: model || this.openRouterModel,
      messages: [
        { role: 'system', content: 'Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await axios.post(
      `${this.openRouterBaseUrl}/chat/completions`,
      requestBody,
      {
        timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 18000),
        headers: {
          Authorization: `Bearer ${this.openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_PUBLIC_URL || 'http://localhost:5173',
          'X-Title': process.env.APP_NAME || 'Travel Platform',
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }

  async callGroqChat({
    prompt,
    temperature = 0.3,
    maxTokens = 2200,
    responseFormat = 'json_object',
  }) {
    if (!this.hasGroqAccess) {
      throw new Error('Groq API key is missing');
    }

    const requestBody = {
      model: this.groqModel,
      messages: [
        { role: 'system', content: 'Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await axios.post(
      `${this.groqBaseUrl}/chat/completions`,
      requestBody,
      {
        timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 30000),
        headers: {
          Authorization: `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }
}

module.exports = AIService;
