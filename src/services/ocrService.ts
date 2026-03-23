import Tesseract from 'tesseract.js';
import { OCRResult, OCRLine } from '../types/electron';

// 鏀寔鐨凮CR璇█妯″瀷
export const OCR_LANGUAGES = [
  { code: 'chi_sim+eng', name: '\u4e2d\u6587\u7b80\u4f53 + \u82f1\u6587' },
  { code: 'chi_tra+eng', name: '\u4e2d\u6587\u7e41\u4f53 + \u82f1\u6587' },
  { code: 'eng', name: '\u82f1\u6587' },
  { code: 'jpn+eng', name: '\u65e5\u8bed + \u82f1\u6587' },
  { code: 'kor+eng', name: '\u97e9\u8bed + \u82f1\u6587' },
  { code: 'fra+eng', name: '\u6cd5\u8bed + \u82f1\u6587' },
  { code: 'spa+eng', name: '\u897f\u73ed\u7259\u8bed + \u82f1\u6587' },
  { code: 'deu+eng', name: '\u5fb7\u8bed + \u82f1\u6587' },
  { code: 'ita+eng', name: '\u610f\u5927\u5229\u8bed + \u82f1\u6587' },
  { code: 'por+eng', name: '\u8461\u8404\u7259\u8bed + \u82f1\u6587' },
  { code: 'rus+eng', name: '\u4fc4\u8bed + \u82f1\u6587' },
];

export const performOCR = async (imageData: string, language: string = 'chi_sim+eng'): Promise<string> => {
  const result = await performOCRWithLines(imageData, language);
  return result.text;
};

// 杩斿洖甯︿綅缃俊鎭殑 OCR 缁撴灉
export const performOCRWithLines = async (imageData: string, language: string = 'chi_sim+eng'): Promise<OCRResult> => {
  try {
    const result = await Tesseract.recognize(
      imageData,
      language,
      {
        logger: (progress) => {
          if (progress.status === 'recognizing text') {
            console.log('OCR 杩涘害:', Math.round(progress.progress * 100) + '%');
          }
        }
      }
    );

    // 鎻愬彇琛岀骇鏁版嵁
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

    // 杩囨护绌鸿
    const filteredLines = lines.filter((line) => line.text.length > 0);

    return {
      text: result.data.text.trim(),
      lines: filteredLines,
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR璇嗗埆澶辫触:', error);
    throw new Error('OCR璇嗗埆澶辫触');
  }
};
