// 微软翻译API实现 - 使用fetch直接调用API
export const translateText = async (text: string, fromLang: string = 'auto', toLang: string = 'zh-Hans'): Promise<string> => {
  try {
    // 实际部署时，从配置中读取API密钥和端点
    // 这些值可以通过环境变量或用户设置提供
    const apiKey = process.env.TRANSLATOR_API_KEY || localStorage.getItem('translator_api_key');
    const region = process.env.TRANSLATOR_REGION || localStorage.getItem('translator_region');
    const endpoint = process.env.TRANSLATOR_ENDPOINT || localStorage.getItem('translator_endpoint');

    // 检查是否提供了必要的凭据
    if (!apiKey) {
      console.warn('未配置翻译API密钥，使用模拟翻译');
      // 模拟翻译服务 - 实际使用时应删除此部分
      return `[已翻译] ${text}`;
    }

    // 如果缺少端点，则构建标准端点
    const fullEndpoint = endpoint || `https://${region}.api.cognitive.microsofttranslator.com/`;

    // 构建API URL
    const url = `${fullEndpoint}/translate?api-version=3.0&from=${fromLang}&to=${toLang}`;

    // 准备请求数据
    const requestBody = [{
      Text: text
    }];

    // 调用翻译API
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
      console.error(`翻译API错误: ${response.status} ${response.statusText}`);
      throw new Error(`翻译API调用失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || !data[0]?.translations || data[0].translations.length === 0) {
      throw new Error('翻译服务返回空结果');
    }

    return data[0].translations[0].text;
  } catch (error) {
    console.error('翻译失败:', error);
    // 在出错时仍然返回原始文本或错误信息
    return `[翻译失败: ${(error as Error).message}] ${text}`;
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