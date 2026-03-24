"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageManager = void 0;
class ImageManager {
    constructor() {
        this.storageKey = 'screenshotTranslatorImages';
        this.items = [];
        this.loadFromStorage();
    }
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.items = parsed.map((item) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            }
        }
        catch (error) {
            console.error('加载图片历史失败:', error);
            this.items = [];
        }
    }
    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.items));
        }
        catch (error) {
            console.error('保存图片历史失败:', error);
        }
    }
    addImage(imageData, ocrText, translatedText, sourceLanguage, targetLanguage) {
        const newItem = {
            id: Date.now().toString(),
            imageData,
            ocrText,
            translatedText,
            timestamp: new Date(),
            sourceLanguage,
            targetLanguage
        };
        this.items.unshift(newItem);
        if (this.items.length > 50) {
            this.items = this.items.slice(0, 50);
        }
        this.saveToStorage();
        return newItem;
    }
    removeImage(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.saveToStorage();
    }
    clearAll() {
        this.items = [];
        this.saveToStorage();
    }
    getAll() {
        return [...this.items];
    }
    getById(id) {
        return this.items.find(item => item.id === id);
    }
    destroyImage(id) {
        const item = this.getById(id);
        if (item) {
            item.imageData = '';
            this.saveToStorage();
        }
    }
}
exports.imageManager = new ImageManager();
//# sourceMappingURL=imageManager.js.map