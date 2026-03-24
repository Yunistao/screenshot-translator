"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LANGUAGES = exports.translateText = exports.translateWithGemini = exports.translateWithClaude = exports.translateWithOpenAICompatible = exports.translateWithSiliconFlow = exports.translateWithOpenAI = exports.translateWithLLM = exports.translateWithYoudao = exports.translateWithBaidu = exports.translateWithGoogle = exports.translateWithMicrosoft = exports.TRANSLATOR_ENGINES = exports.normalizeTranslatorEngine = exports.DEFAULT_TRANSLATOR_ENGINE = void 0;
const spark_md5_1 = __importDefault(require("spark-md5"));
const llmTranslation_1 = require("./llmTranslation");
exports.DEFAULT_TRANSLATOR_ENGINE = 'openai-compatible';
const VISIBLE_TRANSLATOR_ENGINE_SET = new Set([
    'google',
    'baidu',
    'youdao',
    'openai',
    'siliconflow',
    'openai-compatible',
    'claude',
    'gemini',
]);
const normalizeTranslatorEngine = (engine) => {
    if (typeof engine !== 'string') {
        return exports.DEFAULT_TRANSLATOR_ENGINE;
    }
    if (engine === 'microsoft') {
        return exports.DEFAULT_TRANSLATOR_ENGINE;
    }
    return VISIBLE_TRANSLATOR_ENGINE_SET.has(engine)
        ? engine
        : exports.DEFAULT_TRANSLATOR_ENGINE;
};
exports.normalizeTranslatorEngine = normalizeTranslatorEngine;
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
const generateMD5 = (value) => spark_md5_1.default.hash(value);
exports.TRANSLATOR_ENGINES = [
    { code: 'google', name: 'Google Translate' },
    { code: 'baidu', name: 'Baidu Translate' },
    { code: 'youdao', name: 'Youdao Translate' },
    { code: 'openai', name: 'OpenAI (GPT)' },
    { code: 'siliconflow', name: 'SiliconFlow' },
    { code: 'openai-compatible', name: 'OpenAI Compatible' },
    { code: 'claude', name: 'Claude' },
    { code: 'gemini', name: 'Gemini' },
];
const translateWithMicrosoft = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    try {
        const settings = getSettings();
        const apiKey = process.env.TRANSLATOR_API_KEY || settings?.translatorApiKey;
        const region = process.env.TRANSLATOR_REGION || settings?.translatorRegion || 'global';
        const endpoint = process.env.TRANSLATOR_ENDPOINT || settings?.translatorEndpoint;
        if (!apiKey) {
            console.warn('Microsoft Translator API key is not configured');
            return `[Please configure Microsoft Translator API key] ${text}`;
        }
        const fullEndpoint = endpoint || `https://${region}.api.cognitive.microsofttranslator.com/`;
        const url = `${fullEndpoint.replace(/\/$/, '')}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Ocp-Apim-Subscription-Region': region,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([{ Text: text }]),
        });
        if (!response.ok) {
            throw new Error(`Translation API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const translated = data?.[0]?.translations?.[0]?.text;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Microsoft Translator failed:', error);
        return `[Microsoft Translator failed: ${error.message}] ${text}`;
    }
};
exports.translateWithMicrosoft = translateWithMicrosoft;
const translateWithGoogle = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    try {
        const apiKey = getSettings()?.googleTranslateApiKey;
        if (!apiKey) {
            console.warn('Google Translate API key is not configured');
            return `[Please configure Google Translate API key] ${text}`;
        }
        const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(text)}&source=${encodeURIComponent(fromLang)}&target=${encodeURIComponent(toLang)}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Translation API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const translated = data?.data?.translations?.[0]?.translatedText;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Google Translate failed:', error);
        return `[Google Translate failed: ${error.message}] ${text}`;
    }
};
exports.translateWithGoogle = translateWithGoogle;
const translateWithBaidu = async (text, fromLang = 'auto', toLang = 'zh') => {
    try {
        const settings = getSettings();
        const appId = settings?.baiduTranslateAppId;
        const appKey = settings?.baiduTranslateAppKey;
        if (!appId || !appKey) {
            console.warn('Baidu Translate credentials are not configured');
            return `[Please configure Baidu Translate credentials] ${text}`;
        }
        const salt = Date.now().toString();
        const input = text.length > 200 ? `${text.slice(0, 10)}${text.length}${text.slice(-10)}` : text;
        const sign = generateMD5(appId + input + salt + appKey);
        const params = new URLSearchParams({
            q: text,
            from: fromLang,
            to: toLang,
            appid: appId,
            salt,
            sign,
        });
        const response = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (!response.ok) {
            throw new Error(`Translation API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data?.error_code) {
            throw new Error(`Baidu error ${data.error_code}`);
        }
        const translated = data?.trans_result?.[0]?.dst;
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Baidu Translate failed:', error);
        return `[Baidu Translate failed: ${error.message}] ${text}`;
    }
};
exports.translateWithBaidu = translateWithBaidu;
const translateWithYoudao = async (text, fromLang = 'auto', toLang = 'zh-CHS') => {
    try {
        const settings = getSettings();
        const appKey = settings?.youdaoTranslateAppKey;
        const appSecret = settings?.youdaoTranslateAppSecret;
        if (!appKey || !appSecret) {
            console.warn('Youdao Translate credentials are not configured');
            return `[Please configure Youdao Translate credentials] ${text}`;
        }
        const salt = Date.now().toString();
        const curtime = Math.floor(Date.now() / 1000).toString();
        const input = text.length <= 20 ? text : `${text.slice(0, 10)}${text.length}${text.slice(-10)}`;
        const sign = generateMD5(appKey + input + salt + curtime + appSecret);
        const url = new URL('https://openapi.youdao.com/api');
        url.searchParams.set('q', text);
        url.searchParams.set('from', fromLang);
        url.searchParams.set('to', toLang);
        url.searchParams.set('appKey', appKey);
        url.searchParams.set('salt', salt);
        url.searchParams.set('sign', sign);
        url.searchParams.set('signType', 'v3');
        url.searchParams.set('curtime', curtime);
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Translation API request failed: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data?.errorCode && data.errorCode !== '0') {
            throw new Error(`Youdao error ${data.errorCode}`);
        }
        const translated = data?.translation?.[0];
        if (!translated) {
            throw new Error('Translation service returned an empty result');
        }
        return translated;
    }
    catch (error) {
        console.error('Youdao Translate failed:', error);
        return `[Youdao Translate failed: ${error.message}] ${text}`;
    }
};
exports.translateWithYoudao = translateWithYoudao;
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
const buildTranslationSystemPrompt = (fromLang, toLang) => {
    const sourceLangName = fromLang === 'auto' ? 'Auto-detect' : getLanguageName(fromLang);
    const targetLangName = getLanguageName(toLang);
    return `You are a professional translation assistant. Translate from ${sourceLangName} to ${targetLangName}.

Rules:
1. Return only the translation.
2. Preserve formatting and line breaks.
3. Keep code and technical terms intact when appropriate.
4. If the source language is unclear, infer it from context.`;
};
const translateWithOpenAIStyle = async (text, fromLang, toLang, config) => {
    if (config.requireApiKey && !config.apiKey) {
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
                    { role: 'system', content: buildTranslationSystemPrompt(fromLang, toLang) },
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
    return translateWithOpenAIStyle(text, fromLang, toLang, {
        apiKey: settings?.openaiApiKey,
        baseUrl: settings?.openaiBaseUrl,
        model: settings?.openaiModel,
        defaultBaseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        requireApiKey: true,
        providerLabel: 'OpenAI',
    });
};
exports.translateWithOpenAI = translateWithOpenAI;
const translateWithSiliconFlow = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    return translateWithOpenAIStyle(text, fromLang, toLang, {
        apiKey: settings?.siliconflowApiKey,
        baseUrl: settings?.siliconflowBaseUrl,
        model: settings?.siliconflowModel,
        defaultBaseUrl: 'https://api.siliconflow.cn/v1',
        defaultModel: 'Qwen/Qwen2.5-7B-Instruct',
        requireApiKey: true,
        providerLabel: 'SiliconFlow',
    });
};
exports.translateWithSiliconFlow = translateWithSiliconFlow;
const translateWithOpenAICompatible = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    return translateWithOpenAIStyle(text, fromLang, toLang, {
        apiKey: settings?.openaiCompatibleApiKey,
        baseUrl: settings?.openaiCompatibleBaseUrl,
        model: settings?.openaiCompatibleModel,
        defaultBaseUrl: '',
        defaultModel: 'gpt-4o-mini',
        requireApiKey: false,
        providerLabel: 'OpenAI Compatible',
    });
};
exports.translateWithOpenAICompatible = translateWithOpenAICompatible;
const translateWithClaude = async (text, fromLang = 'auto', toLang = 'zh-Hans') => {
    const settings = getSettings();
    if (!settings?.claudeApiKey) {
        console.warn('Claude API key is not configured');
        return `[Please configure Claude API key] ${text}`;
    }
    const sourceLangName = fromLang === 'auto' ? 'Auto-detect' : getLanguageName(fromLang);
    const targetLangName = getLanguageName(toLang);
    const systemPrompt = `You are a professional translation assistant. Translate from ${sourceLangName} to ${targetLangName}.\n\nRules:\n1. Return only the translation.\n2. Preserve formatting and line breaks.\n3. Keep code and technical terms intact when appropriate.\n4. If the source language is unclear, infer it from context.`;
    try {
        const response = await fetch(`${(settings?.claudeBaseUrl || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': settings?.claudeApiKey || '',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: settings?.claudeModel || 'claude-3-haiku-20240307',
                max_tokens: 4096,
                system: systemPrompt,
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
    const sourceLangName = fromLang === 'auto' ? 'Auto-detect' : getLanguageName(fromLang);
    const targetLangName = getLanguageName(toLang);
    const prompt = `Translate from ${sourceLangName} to ${targetLangName}. Return only the translation.\n\nSource text:\n${text}`;
    try {
        const model = settings.geminiModel || 'gemini-1.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.geminiApiKey)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 },
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
const translateText = async (text, fromLang = 'auto', toLang = 'zh-Hans', engine = exports.DEFAULT_TRANSLATOR_ENGINE) => {
    switch (engine) {
        case 'google':
            return (0, exports.translateWithGoogle)(text, fromLang, toLang);
        case 'baidu':
            return (0, exports.translateWithBaidu)(text, fromLang, toLang);
        case 'youdao':
            return (0, exports.translateWithYoudao)(text, fromLang, toLang);
        case 'openai':
            return (0, llmTranslation_1.translateWithLLM)(text, 'openai', fromLang, toLang);
        case 'siliconflow':
            return (0, llmTranslation_1.translateWithLLM)(text, 'siliconflow', fromLang, toLang);
        case 'openai-compatible':
            return (0, llmTranslation_1.translateWithLLM)(text, 'openai-compatible', fromLang, toLang);
        case 'claude':
            return (0, llmTranslation_1.translateWithLLM)(text, 'claude', fromLang, toLang);
        case 'gemini':
            return (0, llmTranslation_1.translateWithLLM)(text, 'gemini', fromLang, toLang);
        case 'microsoft':
            return (0, exports.translateWithMicrosoft)(text, fromLang, toLang);
        default:
            return (0, llmTranslation_1.translateWithLLM)(text, exports.DEFAULT_TRANSLATOR_ENGINE, fromLang, toLang);
    }
};
exports.translateText = translateText;
exports.SUPPORTED_LANGUAGES = [
    { code: 'zh-Hans', name: '\u4e2d\u6587\uff08\u7b80\u4f53\uff09' },
    { code: 'zh-Hant', name: '\u4e2d\u6587\uff08\u7e41\u4f53\uff09' },
    { code: 'en', name: '\u82f1\u8bed' },
    { code: 'ja', name: '\u65e5\u8bed' },
    { code: 'ko', name: '\u97e9\u8bed' },
    { code: 'fr', name: '\u6cd5\u8bed' },
    { code: 'es', name: '\u897f\u73ed\u7259\u8bed' },
    { code: 'ru', name: '\u4fc4\u8bed' },
    { code: 'de', name: '\u5fb7\u8bed' },
    { code: 'it', name: '\u610f\u5927\u5229\u8bed' },
    { code: 'pt', name: '\u8461\u8404\u7259\u8bed' },
];
//# sourceMappingURL=translationService.js.map