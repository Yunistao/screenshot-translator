import React, { useEffect, useMemo, useRef } from 'react';
import ScreenshotTool from './components/ScreenshotTool';
import SettingsPanel from './components/SettingsPanel';
import ScreenshotOverlay from './components/ScreenshotOverlay';
import PinWindow from './components/PinWindow';
import { useAppStore } from './store/appStore';
import { useI18n } from './i18n/I18nContext';

const MainApp: React.FC = () => {
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
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.electronAPI?.onOpenRecentResult?.(handleOpenRecentResult);

    return () => {
      window.electronAPI?.offOpenRecentResult?.();
    };
  }, []);

  return (
    <div className="app-container compact-app workbench-app">
      <section className="workbench-card control-card">
        <ScreenshotTool />
      </section>

      {(ocrText || translatedText) && (
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
    if (!params.toString() && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.slice(window.location.hash.indexOf('?') + 1);
      const hashParams = new URLSearchParams(hashQuery);
      for (const [key, value] of hashParams.entries()) {
        params.set(key, value);
      }
    }

    const isTruthyQuery = (value: string | null) => value === 'true' || value === '1';

    return {
      isOverlay: isTruthyQuery(params.get('overlay')),
      isPin: isTruthyQuery(params.get('pin')),
      isSettings: isTruthyQuery(params.get('settings')),
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
