import React, { useState, useEffect, useMemo } from 'react';
import ScreenshotTool from './components/ScreenshotTool';
import SettingsPanel from './components/SettingsPanel';
import ScreenshotOverlay from './components/ScreenshotOverlay';
import PinWindow from './components/PinWindow';
import { useAppStore } from './store/appStore';
import { imageManager, ImageItem } from './services/imageManager';
import { useI18n } from './i18n/I18nContext';

// 主应用组件
const MainApp: React.FC = () => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historyItems, setHistoryItems] = useState<ImageItem[]>([]);
  const {
    translatedText,
    setTranslatedText,
    ocrText,
    setOcrText,
    imageData,
    setImageData,
    isProcessing
  } = useAppStore();
  const { tNested } = useI18n();

  // 用于跟踪是否已保存到历史记录
  const savedRef = React.useRef<string>('');

  // 应用主题
  useEffect(() => {
    const applyTheme = () => {
      const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
      if (savedSettings) {
        try {
          const { theme } = JSON.parse(savedSettings);
          document.documentElement.setAttribute('data-theme', theme || 'light');
        } catch {
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }
    };

    applyTheme();

    // 监听存储变化以更新主题
    const handleStorageChange = () => applyTheme();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 自动保存到历史记录
  useEffect(() => {
    // 只有当所有数据都存在且不在处理中时才保存
    if (imageData && ocrText && translatedText && !isProcessing) {
      // 使用内容的哈希作为唯一标识，避免重复保存
      const contentHash = `${ocrText}-${translatedText}`.substring(0, 100);

      if (savedRef.current !== contentHash) {
        savedRef.current = contentHash;

        // 获取设置中的语言
        const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
        let sourceLanguage = 'auto';
        let targetLanguage = 'zh-Hans';

        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            sourceLanguage = settings.sourceLanguage || 'auto';
            targetLanguage = settings.targetLanguage || 'zh-Hans';
          } catch {
            // 使用默认值
          }
        }

        // 保存到历史记录
        imageManager.addImage(
          imageData,
          ocrText,
          translatedText,
          sourceLanguage,
          targetLanguage
        );

        // 刷新历史记录列表
        loadHistory();
      }
    }
  }, [ocrText, translatedText, imageData, isProcessing]);

  // 监听截图请求
  useEffect(() => {
    // 加载历史记录
    loadHistory();

    // 监听翻译结果事件
    const handleTranslationResult = (_event: any, imageData: string, translatedText: string) => {
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

  const loadHistory = React.useCallback(() => {
    const items = imageManager.getAll();
    setHistoryItems(items);
  }, []);

  const addToHistory = () => {
    if (imageData && ocrText && translatedText) {
      // 获取设置中的语言
      const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
      let sourceLanguage = 'auto';
      let targetLanguage = 'zh-Hans';

      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          sourceLanguage = settings.sourceLanguage || 'auto';
          targetLanguage = settings.targetLanguage || 'zh-Hans';
        } catch {
          // 使用默认值
        }
      }

      imageManager.addImage(
        imageData,
        ocrText,
        translatedText,
        sourceLanguage,
        targetLanguage
      );
      loadHistory();
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

// 路由入口组件
const App: React.FC = () => {
  // 使用 useMemo 缓存查询参数解析
  const { isOverlay, isPin } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      isOverlay: params.get('overlay') === 'true',
      isPin: params.get('pin') === 'true',
    };
  }, []);

  // 根据查询参数渲染不同的组件
  if (isOverlay) {
    return <ScreenshotOverlay />;
  }

  if (isPin) {
    return <PinWindow />;
  }

  return <MainApp />;
};

export default App;