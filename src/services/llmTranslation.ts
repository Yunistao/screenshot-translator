import { LLMConfig } from '../types/electron';

// 从设置中获取 LLM 配置
const getLLMConfig = (provider: LLMConfig['provider']): LLMConfig | null => {
  const stored = localStorage.getItem('screenshotTranslatorSettings');
  if (!stored) return null;

  try {
    const settings = JSON.parse(stored);
    switch (provider) {
      case 'openai':
        if (settings.openaiApiKey) {
          return {
            provider: 'openai',
            apiKey: settings.openaiApiKey,
            baseUrl: settings.openaiBaseUrl,
            model: settings.openaiModel || 'gpt-4o-mini'
          };
        }
        break;
      case 'claude':
        if (settings.claudeApiKey) {
          return {
            provider: 'claude',
            apiKey: settings.claudeApiKey,
            baseUrl: settings.claudeBaseUrl,
            model: settings.claudeModel || 'claude-3-haiku-20240307'
          };
        }
        break;
      case 'gemini':
        if (settings.geminiApiKey) {
          return {
            provider: 'gemini',
            apiKey: settings.geminiApiKey,
            model: settings.geminiModel || 'gemini-1.5-flash'
          };
        }
        break;
    }
  } catch {
    return null;
  }
  return null;
};

// OpenAI 翻译
export const translateWithOpenAI = async (
  text: string,
  fromLang: string = 'auto',
  toLang: string = 'zh-Hans'
): Promise<string> => {
  const config = getLLMConfig('openai');

  if (!config) {
    console.warn('未配置 OpenAI API 密钥');
    return `[请配置 OpenAI API 密钥] ${text}`;
  }

  const sourceLangName = fromLang === 'auto' ? '自动检测' : getLanguageName(fromLang);
  const targetLangName = getLanguageName(toLang);

  const systemPrompt = `你是一个专业的翻译助手。请将用户提供的文本从${sourceLangName}翻译成${targetLangName}。
要求：
1. 只返回翻译结果，不要添加任何解释或额外内容
2. 保持原文的格式和换行
3. 如果原文是代码或技术术语，保持原样
4. 如果无法确定原文语言，请根据上下文智能判断`;

  try {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || text;
  } catch (error) {
    console.error('OpenAI 翻译失败:', error);
    return `[OpenAI 翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// Claude 翻译
export const translateWithClaude = async (
  text: string,
  fromLang: string = 'auto',
  toLang: string = 'zh-Hans'
): Promise<string> => {
  const config = getLLMConfig('claude');

  if (!config) {
    console.warn('未配置 Claude API 密钥');
    return `[请配置 Claude API 密钥] ${text}`;
  }

  const sourceLangName = fromLang === 'auto' ? '自动检测' : getLanguageName(fromLang);
  const targetLangName = getLanguageName(toLang);

  const systemPrompt = `你是一个专业的翻译助手。请将用户提供的文本从${sourceLangName}翻译成${targetLangName}。
要求：
1. 只返回翻译结果，不要添加任何解释或额外内容
2. 保持原文的格式和换行
3. 如果原文是代码或技术术语，保持原样
4. 如果无法确定原文语言，请根据上下文智能判断`;

  try {
    const baseUrl = config.baseUrl || 'https://api.anthropic.com';
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-haiku-20240307',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: text }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.content?.[0]?.text || text;
  } catch (error) {
    console.error('Claude 翻译失败:', error);
    return `[Claude 翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// Gemini 翻译
export const translateWithGemini = async (
  text: string,
  fromLang: string = 'auto',
  toLang: string = 'zh-Hans'
): Promise<string> => {
  const config = getLLMConfig('gemini');

  if (!config) {
    console.warn('未配置 Gemini API 密钥');
    return `[请配置 Gemini API 密钥] ${text}`;
  }

  const sourceLangName = fromLang === 'auto' ? '自动检测' : getLanguageName(fromLang);
  const targetLangName = getLanguageName(toLang);

  const prompt = `请将以下文本从${sourceLangName}翻译成${targetLangName}。
要求：
1. 只返回翻译结果，不要添加任何解释或额外内容
2. 保持原文的格式和换行
3. 如果原文是代码或技术术语，保持原样

待翻译文本：
${text}`;

  try {
    const model = config.model || 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || text;
  } catch (error) {
    console.error('Gemini 翻译失败:', error);
    return `[Gemini 翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// 获取语言名称
const getLanguageName = (code: string): string => {
  const languageNames: Record<string, string> = {
    'zh-Hans': '简体中文',
    'zh-Hant': '繁体中文',
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'es': '西班牙语',
    'ru': '俄语',
    'de': '德语',
    'it': '意大利语',
    'pt': '葡萄牙语',
    'auto': '自动检测'
  };
  return languageNames[code] || code;
};

// 统一的 LLM 翻译入口
export const translateWithLLM = async (
  text: string,
  provider: LLMConfig['provider'],
  fromLang: string = 'auto',
  toLang: string = 'zh-Hans'
): Promise<string> => {
  switch (provider) {
    case 'openai':
      return translateWithOpenAI(text, fromLang, toLang);
    case 'claude':
      return translateWithClaude(text, fromLang, toLang);
    case 'gemini':
      return translateWithGemini(text, fromLang, toLang);
    default:
      return `[不支持的 LLM 提供商: ${provider}] ${text}`;
  }
};