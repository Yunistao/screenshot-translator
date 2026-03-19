import SparkMD5 from 'spark-md5';
import { translateWithLLM } from './llmTranslation';

// 翻译引擎类型
export type TranslatorEngine = 'microsoft' | 'google' | 'baidu' | 'youdao' | 'openai' | 'claude' | 'gemini';

// 设置接口定义
interface TranslatorSettings {
  translatorApiKey?: string;
  translatorRegion?: string;
  translatorEndpoint?: string;
  googleTranslateApiKey?: string;
  baiduTranslateAppId?: string;
  baiduTranslateAppKey?: string;
  youdaoTranslateAppKey?: string;
  youdaoTranslateAppSecret?: string;
}

// 从统一设置对象读取设置
const getSettings = (): TranslatorSettings | null => {
  const stored = localStorage.getItem('screenshotTranslatorSettings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
};

// 生成MD5签名的函数（使用 spark-md5 库，因为 Web Crypto API 不支持 MD5）
const generateMD5 = (str: string): string => {
  return SparkMD5.hash(str);
};

// 支持的翻译引擎
export const TRANSLATOR_ENGINES = [
  { code: 'microsoft', name: '微软翻译' },
  { code: 'google', name: 'Google翻译' },
  { code: 'baidu', name: '百度翻译' },
  { code: 'youdao', name: '有道翻译' },
  { code: 'openai', name: 'OpenAI (GPT)' },
  { code: 'claude', name: 'Claude' },
  { code: 'gemini', name: 'Gemini' },
];

// 微软翻译API实现
export const translateWithMicrosoft = async (text: string, fromLang: string = 'auto', toLang: string = 'zh-Hans'): Promise<string> => {
  try {
    const settings = getSettings();
    const apiKey = process.env.TRANSLATOR_API_KEY || settings?.translatorApiKey;
    const region = process.env.TRANSLATOR_REGION || settings?.translatorRegion;
    const endpoint = process.env.TRANSLATOR_ENDPOINT || settings?.translatorEndpoint;

    if (!apiKey) {
      console.warn('未配置微软翻译API密钥');
      return `[请配置微软翻译API密钥] ${text}`;
    }

    const fullEndpoint = endpoint || `https://${region}.api.cognitive.microsofttranslator.com/`;
    const url = `${fullEndpoint}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`;

    const requestBody = [{
      Text: text
    }];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Region': region || 'global'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`微软翻译API错误: ${response.status} ${response.statusText}`);
      throw new Error(`翻译API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data[0]?.translations || data[0].translations.length === 0) {
      throw new Error('翻译服务返回空结果');
    }

    return data[0].translations[0].text;
  } catch (error) {
    console.error('微软翻译失败:', error);
    return `[微软翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// Google翻译API实现
export const translateWithGoogle = async (text: string, fromLang: string = 'auto', toLang: string = 'zh-Hans'): Promise<string> => {
  try {
    const settings = getSettings();
    const apiKey = settings?.googleTranslateApiKey;

    if (!apiKey) {
      console.warn('未配置Google翻译API密钥');
      return `[请配置Google翻译API密钥] ${text}`;
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}&q=${encodeURIComponent(text)}&source=${fromLang}&target=${toLang}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Google翻译API错误: ${response.status} ${response.statusText}`);
      throw new Error(`翻译API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data?.data?.translations || data.data.translations.length === 0) {
      throw new Error('翻译服务返回空结果');
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Google翻译失败:', error);
    return `[Google翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// 百度翻译API实现
export const translateWithBaidu = async (text: string, fromLang: string = 'auto', toLang: string = 'zh'): Promise<string> => {
  try {
    const settings = getSettings();
    const appId = settings?.baiduTranslateAppId;
    const appKey = settings?.baiduTranslateAppKey;

    if (!appId || !appKey) {
      console.warn('未配置百度翻译API密钥');
      return `[请配置百度翻译API密钥] ${text}`;
    }

    // 百度翻译API需要签名
    const salt = Date.now().toString();
    // 长文本处理：截取前字符用于签名（百度API要求）
    const input = text.length > 200
      ? text.substring(0, 10) + text.length + text.substring(text.length - 10)
      : text;
    const sign = generateMD5(appId + input + salt + appKey);

    // 使用 POST 请求（官方推荐）
    const url = 'https://fanyi-api.baidu.com/api/trans/vip/translate';
    const params = new URLSearchParams({
      q: text,
      from: fromLang,
      to: toLang,
      appid: appId,
      salt: salt,
      sign: sign
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      console.error(`百度翻译API错误: ${response.status} ${response.statusText}`);
      throw new Error(`翻译API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 检查错误码
    if (data.error_code) {
      const errorMessages: Record<string, string> = {
        '52000': '成功',
        '52001': '请求超时',
        '52002': '系统错误',
        '52003': '未授权用户',
        '54000': '必填参数为空',
        '54001': '签名错误',
        '54003': '访问频率受限',
        '54004': '账户余额不足',
        '54005': '长query请求频繁',
        '58000': '客户端IP非法',
        '58001': '译文语言方向不支持',
        '58002': '服务当前已关闭',
        '90107': '认证未通过'
      };
      const errorMsg = errorMessages[data.error_code] || `错误码: ${data.error_code}`;
      throw new Error(`百度翻译错误: ${errorMsg}`);
    }

    if (!data?.trans_result || data.trans_result.length === 0) {
      throw new Error('翻译服务返回空结果');
    }

    return data.trans_result[0].dst;
  } catch (error) {
    console.error('百度翻译失败:', error);
    return `[百度翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// 有道翻译API实现
export const translateWithYoudao = async (text: string, fromLang: string = 'auto', toLang: string = 'zh-CHS'): Promise<string> => {
  try {
    const settings = getSettings();
    const appKey = settings?.youdaoTranslateAppKey;
    const appSecret = settings?.youdaoTranslateAppSecret;

    if (!appKey || !appSecret) {
      console.warn('未配置有道翻译API密钥');
      return `[请配置有道翻译API密钥] ${text}`;
    }

    // 有道翻译API签名格式：sha256(应用ID+input+salt+curtime+密钥)
    // input规则：文本长度<=20时，input=文本；文本长度>20时，input=文本前10个字符+文本长度+文本后10个字符
    const salt = Date.now().toString();
    const curtime = Math.floor(Date.now() / 1000).toString();

    let input: string;
    if (text.length <= 20) {
      input = text;
    } else {
      input = text.substring(0, 10) + text.length.toString() + text.substring(text.length - 10);
    }

    // 有道签名使用 SHA256，但这里我们用 MD5（有道支持 MD5 签名）
    const signStr = appKey + input + salt + curtime + appSecret;
    const sign = generateMD5(signStr);

    const url = `https://openapi.youdao.com/api?q=${encodeURIComponent(text)}&from=${fromLang}&to=${toLang}&appKey=${appKey}&salt=${salt}&sign=${sign}&signType=v3&curtime=${curtime}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`有道翻译API错误: ${response.status} ${response.statusText}`);
      throw new Error(`翻译API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 检查错误码
    if (data.errorCode && data.errorCode !== '0') {
      const errorMessages: Record<string, string> = {
        '101': '缺少必填参数',
        '102': '不支持的语言类型',
        '103': '翻译文本过长',
        '104': '不支持的API类型',
        '105': '不支持的签名类型',
        '106': '不支持的响应类型',
        '107': '不支持的传输加密类型',
        '108': '应用ID不存在',
        '109': '账户无效',
        '110': '无相关服务的有效实例',
        '111': '开发者账号无效',
        '112': '请求被禁止',
        '113': '用户无权限',
        '201': '解密失败，可能为DES,BASE64,HexDecode错误',
        '202': '签名检验失败',
        '203': '访问IP不在白名单',
        '205': '请求的内容含有敏感词',
        '206': '时间戳不在有效期内',
        '207': '重放请求',
        '301': '辞典查询失败',
        '302': '翻译查询失败',
        '303': '服务端的其它异常',
        '401': '账户已经欠费',
        '411': '访问频率受限,请稍后访问'
      };
      const errorMsg = errorMessages[data.errorCode] || `错误码: ${data.errorCode}`;
      throw new Error(`有道翻译错误: ${errorMsg}`);
    }

    if (!data?.translation || data.translation.length === 0) {
      throw new Error('翻译服务返回空结果');
    }

    return data.translation[0];
  } catch (error) {
    console.error('有道翻译失败:', error);
    return `[有道翻译失败: ${(error as Error).message}] ${text}`;
  }
};

// 主翻译函数
export const translateText = async (text: string, fromLang: string = 'auto', toLang: string = 'zh-Hans', engine: TranslatorEngine = 'microsoft'): Promise<string> => {
  switch (engine) {
    case 'google':
      return translateWithGoogle(text, fromLang, toLang);
    case 'baidu':
      return translateWithBaidu(text, fromLang, toLang);
    case 'youdao':
      return translateWithYoudao(text, fromLang, toLang);
    case 'openai':
      return translateWithLLM(text, 'openai', fromLang, toLang);
    case 'claude':
      return translateWithLLM(text, 'claude', fromLang, toLang);
    case 'gemini':
      return translateWithLLM(text, 'gemini', fromLang, toLang);
    case 'microsoft':
    default:
      return translateWithMicrosoft(text, fromLang, toLang);
  }
};

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: 'zh-Hans', name: '中文（简体）' },
  { code: 'zh-Hant', name: '中文（繁体）' },
  { code: 'en', name: '英语' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'de', name: '德语' },
  { code: 'it', name: '意大利语' },
  { code: 'pt', name: '葡萄牙语' },
];