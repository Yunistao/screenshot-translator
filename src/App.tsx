import React, { useEffect, useMemo, useState } from 'react';
import ScreenshotTool from './components/ScreenshotTool';
import SettingsPanel from './components/SettingsPanel';
import ScreenshotOverlay from './components/ScreenshotOverlay';
import PinWindow from './components/PinWindow';
import { useAppStore } from './store/appStore';
import { useI18n } from './i18n/I18nContext';

const MainApp: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const {
    translatedText,
    setTranslatedText,
    ocrText,
    imageData,
    setImageData,
  } = useAppStore();
  const { tNested } = useI18n();

  useEffect(() => {
    const applyTheme = () => {
      const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
      if (savedSettings) {
        try {
          const { theme } = JSON.parse(savedSettings) as { theme?: string };
          document.documentElement.setAttribute('data-theme', theme || 'light');
          return;
        } catch {
          // Ignore invalid user settings and use default theme.
        }
      }

      document.documentElement.setAttribute('data-theme', 'light');
    };

    applyTheme();
    const handleStorageChange = () => applyTheme();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleTranslationResult = (nextImageData: string, nextTranslatedText: string) => {
      setImageData(nextImageData);
      setTranslatedText(nextTranslatedText);
    };

    window.electronAPI?.onTranslationComplete?.(handleTranslationResult);

    return () => {
      window.electronAPI?.offTranslationComplete?.();
    };
  }, [setImageData, setTranslatedText]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>{tNested('app.title')}</h1>
        <div className="app-controls">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={showSettings ? 'active' : ''}
          >
            {showSettings ? tNested('settings.hide') : tNested('settings.show')}
          </button>
        </div>
      </header>

      {!showSettings && (
        <>
          <ScreenshotTool />

          {(ocrText || translatedText) && (
            <div className="result-container">
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

              {imageData && (
                <div className="screenshot-preview">
                  <img src={imageData} alt={tNested('app.title')} />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showSettings && <SettingsPanel />}
    </div>
  );
};

const App: React.FC = () => {
  const { isOverlay, isPin } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      isOverlay: params.get('overlay') === 'true',
      isPin: params.get('pin') === 'true',
    };
  }, []);

  if (isOverlay) {
    return <ScreenshotOverlay />;
  }

  if (isPin) {
    return <PinWindow />;
  }

  return <MainApp />;
};

export default App;
