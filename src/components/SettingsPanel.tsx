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
    const labels: Record<TranslatorEngine, string> = {
      microsoft: '微软翻译',
      google: 'Google 翻译',
      baidu: '百度翻译',
      youdao: '有道翻译',
      openai: 'OpenAI (GPT)',
      siliconflow: 'SiliconFlow',
      'openai-compatible': 'OpenAI 兼容',
      claude: 'Claude',
      gemini: 'Gemini',
    };
    return labels[code] || code;
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
          <label htmlFor="translatorApiKey">微软翻译 API 密钥</label>
          <input
            type="password"
            id="translatorApiKey"
            value={settings.translatorApiKey}
            onChange={(e) => handleChange('translatorApiKey', e.target.value)}
            placeholder="用于微软翻译（可选）"
          />
        </div>

        <div className="setting-item">
          <label htmlFor="translatorRegion">微软区域</label>
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
          <label htmlFor="translatorEngine">翻译引擎</label>
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
            <label htmlFor="googleTranslateApiKey">Google 翻译 API 密钥</label>
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
              <label htmlFor="baiduTranslateAppId">百度 App ID</label>
              <input
                type="text"
                id="baiduTranslateAppId"
                value={settings.baiduTranslateAppId}
                onChange={(e) => handleChange('baiduTranslateAppId', e.target.value)}
                placeholder="App ID"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="baiduTranslateAppKey">百度 App Key</label>
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
              <label htmlFor="youdaoTranslateAppKey">有道 App Key</label>
              <input
                type="text"
                id="youdaoTranslateAppKey"
                value={settings.youdaoTranslateAppKey}
                onChange={(e) => handleChange('youdaoTranslateAppKey', e.target.value)}
                placeholder="App Key"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="youdaoTranslateAppSecret">有道 App Secret</label>
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
              <label htmlFor="openaiBaseUrl">API 基础地址（可选）</label>
              <input
                type="text"
                id="openaiBaseUrl"
                value={settings.openaiBaseUrl}
                onChange={(e) => handleChange('openaiBaseUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiModel">模型</label>
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
              <label htmlFor="siliconflowBaseUrl">API 基础地址</label>
              <input
                type="text"
                id="siliconflowBaseUrl"
                value={settings.siliconflowBaseUrl}
                onChange={(e) => handleChange('siliconflowBaseUrl', e.target.value)}
                placeholder="https://api.siliconflow.cn/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="siliconflowModel">模型</label>
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
              <label htmlFor="openaiCompatibleApiKey">API 密钥（可选）</label>
              <input
                type="password"
                id="openaiCompatibleApiKey"
                value={settings.openaiCompatibleApiKey}
                onChange={(e) => handleChange('openaiCompatibleApiKey', e.target.value)}
                placeholder="内部网关可留空"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiCompatibleBaseUrl">API 基础地址</label>
              <input
                type="text"
                id="openaiCompatibleBaseUrl"
                value={settings.openaiCompatibleBaseUrl}
                onChange={(e) => handleChange('openaiCompatibleBaseUrl', e.target.value)}
                placeholder="https://your-openai-compatible-endpoint/v1"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiCompatibleModel">模型名称</label>
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
              <label htmlFor="claudeBaseUrl">API 基础地址（可选）</label>
              <input
                type="text"
                id="claudeBaseUrl"
                value={settings.claudeBaseUrl}
                onChange={(e) => handleChange('claudeBaseUrl', e.target.value)}
                placeholder="https://api.anthropic.com"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="claudeModel">模型</label>
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
              <label htmlFor="geminiModel">模型</label>
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
        <h3>OCR 设置</h3>
        <div className="setting-item">
          <label htmlFor="ocrLanguage">OCR 语言</label>
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
