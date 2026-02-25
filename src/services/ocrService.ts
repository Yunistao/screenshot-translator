import Tesseract from 'tesseract.js';

export const performOCR = async (imageData: string): Promise<string> => {
  try {
    // 优先使用中文简体，同时支持英文识别
    const result = await Tesseract.recognize(
      imageData,
      'chi_sim+eng', // 中文简体和英文混合识别
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