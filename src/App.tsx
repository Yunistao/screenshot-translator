import React, { useState, useEffect } from 'react';
import ScreenshotTool from './components/ScreenshotTool';
import SettingsPanel from './components/SettingsPanel';
import { useAppStore } from './store/appStore';
import { imageManager, ImageItem } from './services/imageManager';
import { useI18n } from './i18n/I18nContext';

const App: React.FC = () => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historyItems, setHistoryItems] = useState<ImageItem[]>([]);
  const { translatedText, setTranslatedText, ocrText, setOcrText, imageData, setImageData } = useAppStore();
  const { tNested } = useI18n();

  // 监听截图请求
  useEffect(() => {
    // 加载历史记录
    loadHistory();

    // 监听翻译结果事件
    const handleTranslationResult = (event: any, imageData: string, translatedText: string) => {
      setImageData(imageData);
      setTranslatedText(translatedText);
    };

    // 监听主进程发送的翻译结果
    (window as any).electronAPI?.onTranslationComplete(handleTranslationResult);

    return () => {
      // 清理事件监听器
      (window as any).electronAPI?.offTranslationComplete?.();
    };
  }, [setImageData, setTranslatedText]);

  const loadHistory = () => {
    const items = imageManager.getAll();
    setHistoryItems(items);
  };

  const addToHistory = () => {
    if (imageData && ocrText && translatedText) {
      imageManager.addImage(
        imageData,
        ocrText,
        translatedText,
        'auto', // 源语言，可以改进为自动检测
        'zh-Hans' // 目标语言，可以从设置获取
      );
      loadHistory(); // 重新加载历史记录
    }
  };

  const removeFromHistory = (id: string) => {
    imageManager.removeImage(id);
    loadHistory();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{tNested('app.title')}</h1>
        <div className="app-controls">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={showHistory ? 'active' : ''}
          >
            {showHistory ? tNested('history.hide') : tNested('history.show')}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? 'active' : ''}
          >
            {showSettings ? tNested('settings.hide') : tNested('settings.show')}
          </button>
        </div>
      </header>

      {!showHistory && !showSettings && (
        <>
          <ScreenshotTool />

          {(ocrText || translatedText) && (
            <div className="result-container">
              <div className="result-actions">
                <button onClick={addToHistory}>{tNested('history.item.showAgain')}</button>
              </div>

              {ocrText && (
                <div className="ocr-section">
                  <h2>{tNested('ocr.title')}:</h2>
                  <p>{ocrText}</p>
                </div>
              )}

              {translatedText && (
                <div className="translation-section">
                  <h2>{tNested('translation.title')}:</h2>
                  <p>{translatedText}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showHistory && (
        <div className="history-panel">
          <h2>{tNested('history.title')}</h2>
          <div className="history-actions">
            <button onClick={loadHistory}>{tNested('common.refresh')}</button>
            <button onClick={() => imageManager.clearAll()}>{tNested('history.clear')}</button>
          </div>

          {historyItems.length === 0 ? (
            <p>{tNested('history.empty')}</p>
          ) : (
            <div className="history-list">
              {historyItems.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-content">
                    <h3>{tNested('history.item.ocrPrefix')}{item.ocrText.substring(0, 50)}{item.ocrText.length > 50 ? '...' : ''}</h3>
                    <p>{tNested('history.item.translationPrefix')}{item.translatedText.substring(0, 50)}{item.translatedText.length > 50 ? '...' : ''}</p>
                    <small>{tNested('history.item.timeLabel')}{item.timestamp.toLocaleString()}</small>
                  </div>
                  <div className="history-actions">
                    <button onClick={() => {
                      setOcrText(item.ocrText);
                      setTranslatedText(item.translatedText);
                      setImageData(item.imageData);
                    }}>
                      {tNested('history.item.showAgain')}
                    </button>
                    <button onClick={() => removeFromHistory(item.id)}>
                      {tNested('history.item.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showSettings && <SettingsPanel />}
    </div>
  );
};

export default App;