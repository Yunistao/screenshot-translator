import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { OCR_LANGUAGES } from '../services/ocrService';
import { TRANSLATOR_ENGINES, type TranslatorEngine } from '../services/translationService';

interface Settings {
  shortcutKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatorApiKey: string;
  translatorRegion: string;
  translatorEndpoint: string;
  autoCopy: boolean;
  fontSize: number;
  opacity: number;
  theme: 'light' | 'dark';
  ocrLanguage: string;
  translatorEngine: TranslatorEngine;
  googleTranslateApiKey: string;
  baiduTranslateAppId: string;
  baiduTranslateAppKey: string;
  youdaoTranslateAppKey: string;
  youdaoTranslateAppSecret: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  siliconflowApiKey: string;
  siliconflowBaseUrl: string;
  siliconflowModel: string;
  openaiCompatibleApiKey: string;
  openaiCompatibleBaseUrl: string;
  openaiCompatibleModel: string;
  claudeApiKey: string;
  claudeBaseUrl: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

const createDefaultSettings = (): Settings => ({
  shortcutKey: 'Alt+S',
  sourceLanguage: 'auto',
  targetLanguage: 'zh-Hans',
  translatorApiKey: '',
  translatorRegion: 'global',
  translatorEndpoint: '',
  autoCopy: true,
  fontSize: 14,
  opacity: 0.9,
  theme: 'light',
  ocrLanguage: 'chi_sim+eng',
  translatorEngine: 'microsoft',
  googleTranslateApiKey: '',
  baiduTranslateAppId: '',
  baiduTranslateAppKey: '',
  youdaoTranslateAppKey: '',
  youdaoTranslateAppSecret: '',
  openaiApiKey: '',
  openaiBaseUrl: '',
  openaiModel: 'gpt-4o-mini',
  siliconflowApiKey: '',
  siliconflowBaseUrl: 'https://api.siliconflow.cn/v1',
  siliconflowModel: 'Qwen/Qwen2.5-7B-Instruct',
  openaiCompatibleApiKey: '',
  openaiCompatibleBaseUrl: '',
  openaiCompatibleModel: '',
  claudeApiKey: '',
  claudeBaseUrl: '',
  claudeModel: 'claude-3-haiku-20240307',
  geminiApiKey: '',
  geminiModel: 'gemini-1.5-flash',
});

const normalizeSettings = (value: unknown): Settings => {
  if (!value || typeof value !== 'object') {
    return createDefaultSettings();
  }

  return {
    ...createDefaultSettings(),
    ...(value as Partial<Settings>),
  };
};

const SettingsPanel: React.FC = () => {
  const { tNested } = useI18n();
  const [settings, setSettings] = useState<Settings>(createDefaultSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
    if (!savedSettings) return;

    try {
      setSettings(normalizeSettings(JSON.parse(savedSettings)));
    } catch (error) {
      console.error('Failed to parse settings:', error);
    }
  }, []);

  const handleChange = <K extends keyof Settings>(field: K, value: Settings[K]) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));

    if (saved) {
      setSaved(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('screenshotTranslatorSettings', JSON.stringify(settings));
    window.electronAPI?.updateShortcut?.(settings.shortcutKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(createDefaultSettings());
    localStorage.removeItem('screenshotTranslatorSettings');
  };

  const getEngineLabel = (code: TranslatorEngine): string => {
    const labelKeys: Record<TranslatorEngine, string> = {
      microsoft: 'settings.translation.engines.microsoft',
      google: 'settings.translation.engines.google',
      baidu: 'settings.translation.engines.baidu',
      youdao: 'settings.translation.engines.youdao',
      openai: 'settings.translation.engines.openai',
      siliconflow: 'settings.translation.engines.siliconflow',
      'openai-compatible': 'settings.translation.engines.openaiCompatible',
      claude: 'settings.translation.engines.claude',
      gemini: 'settings.translation.engines.gemini',
    };
    const key = labelKeys[code];
    return key ? tNested(key) : code;
  };

  return (
    <div className="settings-panel">
      <h2>{tNested('settings.title')}</h2>

      {saved && (
        <div className="save-notification">
          {tNested('settings.saved')}
        </div>
      )}

      <div className="setting-group">
        <h3>{tNested('settings.shortcut.title')}</h3>
        <div className="setting-item">
          <label htmlFor="shortcutKey">{tNested('settings.shortcut.keyLabel')}</label>
          <input
            type="text"
            id="shortcutKey"
            value={settings.shortcutKey}
            onChange={(e) => handleChange('shortcutKey', e.target.value)}
            placeholder={tNested('settings.shortcut.placeholder')}
          />
        </div>
      </div>

      <div className="setting-group">
        <h3>{tNested('settings.translation.title')}</h3>

        <div className="setting-item">
          <label htmlFor="translatorApiKey">{tNested('settings.translation.providers.microsoftApiKeyLabel')}</label>
          <input
            type="password"
            id="translatorApiKey"
            value={settings.translatorApiKey}
            onChange={(e) => handleChange('translatorApiKey', e.target.value)}
            placeholder={tNested('settings.translation.providers.microsoftApiKeyPlaceholder')}
          />
        </div>

        <div className="setting-item">
          <label htmlFor="translatorRegion">{tNested('settings.translation.providers.microsoftRegionLabel')}</label>
          <input
            type="text"
            id="translatorRegion"
            value={settings.translatorRegion}
            onChange={(e) => handleChange('translatorRegion', e.target.value)}
            placeholder="global"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="sourceLanguage">{tNested('settings.translation.sourceLabel')}</label>
          <select
            id="sourceLanguage"
            value={settings.sourceLanguage}
            onChange={(e) => handleChange('sourceLanguage', e.target.value)}
          >
            <option value="auto">{tNested('settings.translation.autoDetect')}</option>
            <option value="zh-Hans">{tNested('settings.languages.zhHans')}</option>
            <option value="zh-Hant">{tNested('settings.languages.zhHant')}</option>
            <option value="en">{tNested('settings.languages.en')}</option>
            <option value="ja">{tNested('settings.languages.ja')}</option>
            <option value="ko">{tNested('settings.languages.ko')}</option>
            <option value="fr">{tNested('settings.languages.fr')}</option>
            <option value="es">{tNested('settings.languages.es')}</option>
            <option value="ru">{tNested('settings.languages.ru')}</option>
            <option value="de">{tNested('settings.languages.de')}</option>
            <option value="it">{tNested('settings.languages.it')}</option>
            <option value="pt">{tNested('settings.languages.pt')}</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="targetLanguage">{tNested('settings.translation.targetLabel')}</label>
          <select
            id="targetLanguage"
            value={settings.targetLanguage}
            onChange={(e) => handleChange('targetLanguage', e.target.value)}
          >
            <option value="zh-Hans">{tNested('settings.languages.zhHans')}</option>
            <option value="zh-Hant">{tNested('settings.languages.zhHant')}</option>
            <option value="en">{tNested('settings.languages.en')}</option>
            <option value="ja">{tNested('settings.languages.ja')}</option>
            <option value="ko">{tNested('settings.languages.ko')}</option>
            <option value="fr">{tNested('settings.languages.fr')}</option>
            <option value="es">{tNested('settings.languages.es')}</option>
            <option value="ru">{tNested('settings.languages.ru')}</option>
            <option value="de">{tNested('settings.languages.de')}</option>
            <option value="it">{tNested('settings.languages.it')}</option>
            <option value="pt">{tNested('settings.languages.pt')}</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="translatorEngine">{tNested('settings.translation.engineLabel')}</label>
          <select
            id="translatorEngine"
            value={settings.translatorEngine}
            onChange={(e) => handleChange('translatorEngine', e.target.value as TranslatorEngine)}
          >
            {TRANSLATOR_ENGINES.map(engine => (
              <option key={engine.code} value={engine.code}>{getEngineLabel(engine.code)}</option>
            ))}
          </select>
        </div>

        {settings.translatorEngine === 'google' && (
          <div className="setting-item">
            <label htmlFor="googleTranslateApiKey">{tNested('settings.translation.providers.googleApiKeyLabel')}</label>
            <input
              type="password"
              id="googleTranslateApiKey"
              value={settings.googleTranslateApiKey}
              onChange={(e) => handleChange('googleTranslateApiKey', e.target.value)}
              placeholder="AIza..."
            />
          </div>
        )}

        {settings.translatorEngine === 'baidu' && (
          <>
            <div className="setting-item">
              <label htmlFor="baiduTranslateAppId">{tNested('settings.translation.providers.baiduAppIdLabel')}</label>
              <input
                type="text"
                id="baiduTranslateAppId"
                value={settings.baiduTranslateAppId}
                onChange={(e) => handleChange('baiduTranslateAppId', e.target.value)}
                placeholder="App ID"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="baiduTranslateAppKey">{tNested('settings.translation.providers.baiduAppKeyLabel')}</label>
              <input
                type="password"
                id="baiduTranslateAppKey"
                value={settings.baiduTranslateAppKey}
                onChange={(e) => handleChange('baiduTranslateAppKey', e.target.value)}
                placeholder="App Key"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'youdao' && (
          <>
            <div className="setting-item">
              <label htmlFor="youdaoTranslateAppKey">{tNested('settings.translation.providers.youdaoAppKeyLabel')}</label>
              <input
                type="text"
                id="youdaoTranslateAppKey"
                value={settings.youdaoTranslateAppKey}
                onChange={(e) => handleChange('youdaoTranslateAppKey', e.target.value)}
                placeholder="App Key"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="youdaoTranslateAppSecret">{tNested('settings.translation.providers.youdaoAppSecretLabel')}</label>
              <input
                type="password"
                id="youdaoTranslateAppSecret"
                value={settings.youdaoTranslateAppSecret}
                onChange={(e) => handleChange('youdaoTranslateAppSecret', e.target.value)}
                placeholder="App Secret"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'openai' && (
          <>
            <div className="setting-item">
              <label htmlFor="openaiApiKey">OpenAI API Key</label>
              <input
                type="password"
                id="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiBaseUrl">{tNested('settings.translation.baseUrlOptionalLabel')}</label>
              <input
                type="text"
                id="openaiBaseUrl"
                value={settings.openaiBaseUrl}
                onChange={(e) => handleChange('openaiBaseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiModel">{tNested('settings.translation.modelLabel')}</label>
              <input
                type="text"
                id="openaiModel"
                value={settings.openaiModel}
                onChange={(e) => handleChange('openaiModel', e.target.value)}
                placeholder="gpt-4o-mini"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'siliconflow' && (
          <>
            <div className="setting-item">
              <label htmlFor="siliconflowApiKey">SiliconFlow API Key</label>
              <input
                type="password"
                id="siliconflowApiKey"
                value={settings.siliconflowApiKey}
                onChange={(e) => handleChange('siliconflowApiKey', e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="siliconflowBaseUrl">{tNested('settings.translation.baseUrlLabel')}</label>
              <input
                type="text"
                id="siliconflowBaseUrl"
                value={settings.siliconflowBaseUrl}
                onChange={(e) => handleChange('siliconflowBaseUrl', e.target.value)}
                placeholder="https://api.siliconflow.cn/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="siliconflowModel">{tNested('settings.translation.modelLabel')}</label>
              <input
                type="text"
                id="siliconflowModel"
                value={settings.siliconflowModel}
                onChange={(e) => handleChange('siliconflowModel', e.target.value)}
                placeholder="Qwen/Qwen2.5-7B-Instruct"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'openai-compatible' && (
          <>
            <div className="setting-item">
              <label htmlFor="openaiCompatibleApiKey">{tNested('settings.translation.apiKeyOptionalLabel')}</label>
              <input
                type="password"
                id="openaiCompatibleApiKey"
                value={settings.openaiCompatibleApiKey}
                onChange={(e) => handleChange('openaiCompatibleApiKey', e.target.value)}
                placeholder={tNested('settings.translation.openaiCompatibleApiKeyPlaceholder')}
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiCompatibleBaseUrl">{tNested('settings.translation.baseUrlLabel')}</label>
              <input
                type="text"
                id="openaiCompatibleBaseUrl"
                value={settings.openaiCompatibleBaseUrl}
                onChange={(e) => handleChange('openaiCompatibleBaseUrl', e.target.value)}
                placeholder="https://your-openai-compatible-endpoint/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiCompatibleModel">{tNested('settings.translation.modelNameLabel')}</label>
              <input
                type="text"
                id="openaiCompatibleModel"
                value={settings.openaiCompatibleModel}
                onChange={(e) => handleChange('openaiCompatibleModel', e.target.value)}
                placeholder="qwen2.5-7b-instruct"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'claude' && (
          <>
            <div className="setting-item">
              <label htmlFor="claudeApiKey">Claude API Key</label>
              <input
                type="password"
                id="claudeApiKey"
                value={settings.claudeApiKey}
                onChange={(e) => handleChange('claudeApiKey', e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="claudeBaseUrl">{tNested('settings.translation.baseUrlOptionalLabel')}</label>
              <input
                type="text"
                id="claudeBaseUrl"
                value={settings.claudeBaseUrl}
                onChange={(e) => handleChange('claudeBaseUrl', e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="claudeModel">{tNested('settings.translation.modelLabel')}</label>
              <input
                type="text"
                id="claudeModel"
                value={settings.claudeModel}
                onChange={(e) => handleChange('claudeModel', e.target.value)}
                placeholder="claude-3-haiku-20240307"
              />
            </div>
          </>
        )}

        {settings.translatorEngine === 'gemini' && (
          <>
            <div className="setting-item">
              <label htmlFor="geminiApiKey">Gemini API Key</label>
              <input
                type="password"
                id="geminiApiKey"
                value={settings.geminiApiKey}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                placeholder="AIza..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="geminiModel">{tNested('settings.translation.modelLabel')}</label>
              <input
                type="text"
                id="geminiModel"
                value={settings.geminiModel}
                onChange={(e) => handleChange('geminiModel', e.target.value)}
                placeholder="gemini-1.5-flash"
              />
            </div>
          </>
        )}
      </div>

      <div className="setting-group">
        <h3>{tNested('settings.ocrSection.title')}</h3>
        <div className="setting-item">
          <label htmlFor="ocrLanguage">{tNested('settings.ocrSection.languageLabel')}</label>
          <select
            id="ocrLanguage"
            value={settings.ocrLanguage}
            onChange={(e) => handleChange('ocrLanguage', e.target.value)}
          >
            {OCR_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="setting-group">
        <h3>{tNested('settings.interface.title')}</h3>

        <div className="setting-item">
          <label htmlFor="fontSize">{tNested('settings.interface.fontSizeLabel')}</label>
          <input
            type="range"
            id="fontSize"
            min="10"
            max="24"
            step="1"
            value={settings.fontSize}
            onChange={(e) => handleChange('fontSize', parseInt(e.target.value, 10))}
          />
          <span>{settings.fontSize}px</span>
        </div>

        <div className="setting-item">
          <label htmlFor="opacity">{tNested('settings.interface.opacityLabel')}</label>
          <input
            type="range"
            id="opacity"
            min="0.1"
            max="1"
            step="0.1"
            value={settings.opacity}
            onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
          />
          <span>{Math.round(settings.opacity * 100)}%</span>
        </div>

        <div className="setting-item">
          <label htmlFor="theme">{tNested('settings.interface.themeLabel')}</label>
          <select
            id="theme"
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value as 'light' | 'dark')}
          >
            <option value="light">{tNested('settings.interface.lightTheme')}</option>
            <option value="dark">{tNested('settings.interface.darkTheme')}</option>
          </select>
        </div>

        <div className="setting-item">
          <label htmlFor="autoCopy">
            <input
              type="checkbox"
              id="autoCopy"
              checked={settings.autoCopy}
              onChange={(e) => handleChange('autoCopy', e.target.checked)}
            />
            {tNested('settings.interface.autoCopyLabel')}
          </label>
        </div>
      </div>

      <div className="setting-actions">
        <button onClick={handleSave}>{tNested('settings.actions.save')}</button>
        <button onClick={handleReset}>{tNested('settings.actions.reset')}</button>
      </div>
    </div>
  );
};

export default SettingsPanel;
