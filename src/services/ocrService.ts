import Tesseract from 'tesseract.js';

// 支持的OCR语言模型
export const OCR_LANGUAGES = [
  { code: 'chi_sim+eng', name: '中文简体 + 英文' },
  { code: 'chi_tra+eng', name: '中文繁体 + 英文' },
  { code: 'eng', name: '英文' },
  { code: 'jpn+eng', name: '日语 + 英文' },
  { code: 'kor+eng', name: '韩语 + 英文' },
  { code: 'fra+eng', name: '法语 + 英文' },
  { code: 'spa+eng', name: '西班牙语 + 英文' },
  { code: 'deu+eng', name: '德语 + 英文' },
  { code: 'ita+eng', name: '意大利语 + 英文' },
  { code: 'por+eng', name: '葡萄牙语 + 英文' },
  { code: 'rus+eng', name: '俄语 + 英文' },
];

export const performOCR = async (imageData: string, language: string = 'chi_sim+eng'): Promise<string> => {
  try {
    const result = await Tesseract.recognize(
      imageData,
      language,
      {
        logger: (progress) => {
          console.log('OCR识别进度:', progress);
        }
      }
    );

    return result.data.text.trim();
  } catch (error) {
    console.error('OCR识别失败:', error);
    throw new Error('OCR识别失败');
  }
};