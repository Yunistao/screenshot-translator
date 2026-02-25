// 图片管理服务
export interface ImageItem {
  id: string;
  imageData: string;
  ocrText: string;
  translatedText: string;
  timestamp: Date;
  sourceLanguage?: string;
  targetLanguage?: string;
}

class ImageManager {
  private storageKey = 'screenshotTranslatorImages';
  private items: ImageItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // 从本地存储加载图片历史
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.items = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('加载图片历史失败:', error);
      this.items = [];
    }
  }

  // 保存到本地存储
  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (error) {
      console.error('保存图片历史失败:', error);
    }
  }

  // 添加新的图片项
  addImage(imageData: string, ocrText: string, translatedText: string, sourceLanguage?: string, targetLanguage?: string) {
    const newItem: ImageItem = {
      id: Date.now().toString(), // 简单的ID生成
      imageData,
      ocrText,
      translatedText,
      timestamp: new Date(),
      sourceLanguage,
      targetLanguage
    };

    // 添加到列表开头
    this.items.unshift(newItem);

    // 限制历史记录数量（最多保留50条）
    if (this.items.length > 50) {
      this.items = this.items.slice(0, 50);
    }

    this.saveToStorage();
    return newItem;
  }

  // 删除指定图片
  removeImage(id: string) {
    this.items = this.items.filter(item => item.id !== id);
    this.saveToStorage();
  }

  // 清空所有图片
  clearAll() {
    this.items = [];
    this.saveToStorage();
  }

  // 获取所有图片
  getAll(): ImageItem[] {
    return [...this.items]; // 返回副本以避免外部修改
  }

  // 根据ID获取图片
  getById(id: string): ImageItem | undefined {
    return this.items.find(item => item.id === id);
  }

  // 销毁指定图片（清除图像数据以节省内存）
  destroyImage(id: string) {
    const item = this.getById(id);
    if (item) {
      // 清除图像数据，保留其他信息
      item.imageData = '';
      this.saveToStorage();
    }
  }
}

export const imageManager = new ImageManager();