const AIService = require('./aiService');

class GeminiService {
  constructor() {
    this.aiService = new AIService();
  }

  async generateStructuredJson({ prompt, maxOutputTokens = 2600, temperature = 0.4 }) {
    const response = await this.aiService.callGemini({
      prompt,
      model: 'gemini-2.5-flash',
      temperature,
      maxOutputTokens,
      responseMimeType: 'application/json',
      timeoutMs: 30000,
    });

    const jsonBlock = this.aiService.extractJsonBlock(response, response);
    return JSON.parse(jsonBlock);
  }
}

module.exports = GeminiService;
