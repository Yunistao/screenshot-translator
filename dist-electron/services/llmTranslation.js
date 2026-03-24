"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateWithLLM = exports.translateWithGemini = exports.translateWithClaude = exports.translateWithOpenAICompatible = exports.translateWithSiliconFlow = exports.translateWithOpenAI = void 0;
const getSettings = () => {
    const stored = localStorage.getItem('screenshotTranslatorSettings');
    if (!stored)
        return null;
    try {
        return JSON.parse(stored);
    }
    catch {
        return null;
    }
};
const getLanguageName = (code) => {
    const languageNames = {
        'zh-Hans': 'Simplified Chinese',
        'zh-Hant': 'Traditional Chinese',
        'en': 'English',
        'ja': 'Japanese',
        'ko': 'Korean',
        'fr': 'French',
        'es': 'Spanish',
        'ru': 'Russian',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'auto': 'Auto-detect',
    };
    return languageNames[code] || code;
};
const buildSystemPrompt = (fromLang, toLang) => {
    const source = fromLang === 'auto' ? 'Auto-detect' : getLanguageName(fromLang);
    const target = getLanguageName(toLang);
    return `You are a professional translation assistant. Translate from ${source} to ${target}.

Rules:
1. Return only the translation.
2. Preserve formatting and line breaks.
3. Keep code and technical terms intact when appropriate.
4. If the source language is unclear, infer it from context.`;
};
const translateWithChatCompletions = async (text, fromLang, toLang, config) => {
    if (!config.allowAnonymous && !config.apiKey) {
        console.warn(`${config.providerLabel} API key is not configured`);
        return `[Please configure ${config.providerLabel} API key] ${text}`;
    }
    const baseUrl = (config.baseUrl || config.defaultBaseUrl || '').replace(/\/$/, '');
    if (!baseUrl) {
        console.warn(`${config.providerLabel} base URL is not configured`);
        return `[Please configure ${config.providerLabel} base URL] ${text}`;
    }
    const headers = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
    }
    try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model || config.defaultModel,
                messages: [
                    { role: 'system', content: buildSystemPrompt(fromLang, toLang) },
                    { role: 'user', content: text },
                ],
                temperature: 0.3,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `${response.status} ${response.statusText}`;
            throw new Error(errorMsg);
        }
        const data = await response.json();
        const translated = data?.choices?.[0]?.message?.content;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error(`${config.providerLabel} translation failed:`, error);
        return `[${config.providerLabel} translation failed: ${error.message}] ${text}`;
    }
};
const translateWithOpenAI = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    return translateWithChatCompletions(text, fromLang, toLang, {
        apiKey: settings?.openaiApiKey,
        baseUrl: settings?.openaiBaseUrl,
        model: settings?.openaiModel,
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        providerLabel: 'OpenAI',
        allowAnonymous: false,
    });
};
exports.translateWithOpenAI = translateWithOpenAI;
const translateWithSiliconFlow = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    return translateWithChatCompletions(text, fromLang, toLang, {
        apiKey: settings?.siliconflowApiKey,
        baseUrl: settings?.siliconflowBaseUrl,
        model: settings?.siliconflowModel,
        defaultBaseUrl: 'https://api.siliconflow.cn/v1',
        defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
        providerLabel: 'SiliconFlow',
        allowAnonymous: false,
    });
};
exports.translateWithSiliconFlow = translateWithSiliconFlow;
const translateWithOpenAICompatible = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    return translateWithChatCompletions(text, fromLang, toLang, {
        apiKey: settings?.openaiCompatibleApiKey,
        baseUrl: settings?.openaiCompatibleBaseUrl,
        model: settings?.openaiCompatibleModel,
        defaultBaseUrl: '',
        defaultModel: 'gpt-4o-mini',
        providerLabel: 'OpenAI Compatible',
        allowAnonymous: true,
    });
};
exports.translateWithOpenAICompatible = translateWithOpenAICompatible;
const translateWithClaude = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    if (!settings?.claudeApiKey) {
        console.warn('Claude API key is not configured');
        return `[Please configure Claude API key] ${text}`;
    }
    try {
        const baseUrl = (settings.claudeBaseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': settings.claudeApiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: settings.claudeModel || 'claude-3-haiku-20240307',
                max_tokens: 4096,
                system: buildSystemPrompt(fromLang, toLang),
                messages: [{ role: 'user', content: text }],
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `${response.status} ${response.statusText}`;
            throw new Error(errorMsg);
        }
        const data = await response.json();
        const translated = data?.content?.[0]?.text;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Claude translation failed:', error);
        return `[Claude translation failed: ${error.message}] ${text}`;
    }
};
exports.translateWithClaude = translateWithClaude;
const translateWithGemini = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    if (!settings?.geminiApiKey) {
        console.warn('Gemini API key is not configured');
        return `[Please configure Gemini API key] ${text}`;
    }
    const model = settings.geminiModel || 'gemini-1.5-flash';
    const prompt = buildSystemPrompt(fromLang, toLang) + `\n\nSource text:\n${text}`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                },
            }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || `${response.status} ${response.statusText}`;
            throw new Error(errorMsg);
        }
        const data = await response.json();
        const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Gemini translation failed:', error);
        return `[Gemini translation failed: ${error.message}] ${text}`;
    }
};
exports.translateWithGemini = translateWithGemini;
const translateWithLLM = async (text, provider, fromLang = 'auto', toLang = 'zh-Hans') => {
    switch (provider) {
        case 'openai':
            return (0, exports.translateWithOpenAI)(text, fromLang, toLang);
        case 'siliconflow':
            return (0, exports.translateWithSiliconFlow)(text, fromLang, toLang);
        case 'openai-compatible':
            return (0, exports.translateWithOpenAICompatible)(text, fromLang, toLang);
        case 'claude':
            return (0, exports.translateWithClaude)(text, fromLang, toLang);
        case 'gemini':
            return (0, exports.translateWithGemini)(text, fromLang, toLang);
        default:
            return `[Unsupported LLM provider: ${provider}] ${text}`;
    }
};
exports.translateWithLLM = translateWithLLM;
//# sourceMappingURL=llmTranslation.js.map