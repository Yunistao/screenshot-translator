import React, { useEffect, useMemo, useRef, useState } from 'react';
import ScreenshotTool from './components/ScreenshotTool';
import SettingsPanel from './components/SettingsPanel';
import ScreenshotOverlay from './components/ScreenshotOverlay';
import PinWindow from './components/PinWindow';
import { useAppStore } from './store/appStore';
import { useI18n } from './i18n/I18nContext';

const MainApp: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const { translatedText, setTranslatedText, ocrText, imageData, setImageData } = useAppStore();
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

  useEffect(() => {
    const handleOpenRecentResult = () => {
      setShowSettings(false);
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.electronAPI?.onOpenRecentResult?.(handleOpenRecentResult);

    return () => {
      window.electronAPI?.offOpenRecentResult?.();
    };
  }, []);

  return (
    <div className="app-container compact-app workbench-app">
      <div className="main-toolbar">
        <button
          type="button"
          className={`settings-gear-button ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings((previous) => !previous)}
          aria-label={showSettings ? tNested('settings.hide') : tNested('settings.show')}
          title={showSettings ? tNested('settings.hide') : tNested('settings.show')}
        >
          <span aria-hidden="true">{'\u2699'}</span>
        </button>
      </div>

      {!showSettings && (
        <section className="workbench-card control-card">
          <ScreenshotTool />
        </section>
      )}

      {showSettings && (
        <section className="workbench-card settings-card">
          <SettingsPanel />
        </section>
      )}

      {!showSettings && (ocrText || translatedText) && (
        <div className="workbench-card result-container compact-result result-card" ref={resultRef}>
          {ocrText && (
            <div className="ocr-section">
              <h2>{tNested('ocr.title')}</h2>
              <p>{ocrText}</p>
            </div>
          )}

          {translatedText && (
            <div className="translation-section">
              <h2>{tNested('translation.title')}</h2>
              <p>{translatedText}</p>
            </div>
          )}

          {imageData && (
            <div className="screenshot-preview compact-preview">
              <img src={imageData} alt={tNested('app.title')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SettingsShell: React.FC = () => {
  const { tNested } = useI18n();

  return (
    <div className="settings-shell">
      <header className="settings-shell-header">
        <h1>{tNested('settings.title')}</h1>
      </header>
      <SettingsPanel />
    </div>
  );
};

const App: React.FC = () => {
  const { isOverlay, isPin, isSettings } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      isOverlay: params.get('overlay') === 'true',
      isPin: params.get('pin') === 'true',
      isSettings: params.get('settings') === 'true',
    };
  }, []);

  if (isOverlay) {
    return <ScreenshotOverlay />;
  }

  if (isPin) {
    return <PinWindow />;
  }

  if (isSettings) {
    return <SettingsShell />;
  }

  return <MainApp />;
};

export default App;
