import Tesseract from 'tesseract.js';
import { OCRResult, OCRLine } from '../types/electron';

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
  const result = await performOCRWithLines(imageData, language);
  return result.text;
};

// 返回带位置信息的 OCR 结果
export const performOCRWithLines = async (imageData: string, language: string = 'chi_sim+eng'): Promise<OCRResult> => {
  try {
    const result = await Tesseract.recognize(
      imageData,
      language,
      {
        logger: (progress) => {
          if (progress.status === 'recognizing text') {
            console.log('OCR 进度:', Math.round(progress.progress * 100) + '%');
          }
        }
      }
    );

    // 提取行级数据
    const lines: OCRLine[] = result.data.lines
      ? result.data.lines.map((line) => ({
          text: line.text.trim(),
          bbox: {
            x0: line.bbox.x0,
            y0: line.bbox.y0,
            x1: line.bbox.x1,
            y1: line.bbox.y1,
          },
        }))
      : [];

    // 过滤空行
    const filteredLines = lines.filter((line) => line.text.length > 0);

    return {
      text: result.data.text.trim(),
      lines: filteredLines,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR识别失败:', error);
    throw new Error('OCR识别失败');
  }
};