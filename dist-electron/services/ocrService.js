"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performOCRWithLines = exports.performOCR = exports.OCR_LANGUAGES = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
exports.OCR_LANGUAGES = [
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
const performOCR = async (imageData, language = 'chi_sim+eng') => {
    const result = await (0, exports.performOCRWithLines)(imageData, language);
    return result.text;
};
exports.performOCR = performOCR;
const performOCRWithLines = async (imageData, language = 'chi_sim+eng') => {
    try {
        const result = await tesseract_js_1.default.recognize(imageData, language, {
            logger: (progress) => {
                if (progress.status === 'recognizing text') {
                    console.log('OCR 杩涘害:', Math.round(progress.progress * 100) + '%');
                }
            }
        });
        const lines = result.data.lines
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
        const filteredLines = lines.filter((line) => line.text.length > 0);
        return {
            text: result.data.text.trim(),
            lines: filteredLines,
            confidence: result.data.confidence,
        };
    }
    catch (error) {
        console.error('OCR璇嗗埆澶辫触:', error);
        throw new Error('OCR璇嗗埆澶辫触');
    }
};
exports.performOCRWithLines = performOCRWithLines;
//# sourceMappingURL=ocrService.js.map