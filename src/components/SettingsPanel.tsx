import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { OCR_LANGUAGES } from '../services/ocrService';
import { TRANSLATOR_ENGINES } from '../services/translationService';

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
  translatorEngine: string;
  googleTranslateApiKey: string;
  baiduTranslateAppId: string;
  baiduTranslateAppKey: string;
  youdaoTranslateAppKey: string;
  youdaoTranslateAppSecret: string;
  // LLM 配置
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;
  claudeApiKey: string;
  claudeBaseUrl: string;
  claudeModel: string;
  geminiApiKey: string;
  geminiModel: string;
}

const SettingsPanel: React.FC = () => {
  const { tNested } = useI18n();

  // 仅在需要时才定义，如果不需要就移除
  const [settings, setSettings] = useState<Settings>({
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
    // LLM 配置
    openaiApiKey: '',
    openaiBaseUrl: '',
    openaiModel: 'gpt-4o-mini',
    claudeApiKey: '',
    claudeBaseUrl: '',
    claudeModel: 'claude-3-haiku-20240307',
    geminiApiKey: '',
    geminiModel: 'gemini-1.5-flash',
  });
  const [saved, setSaved] = useState(false);

  // 加载保存的设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('screenshotTranslatorSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('解析设置失败:', error);
      }
    }
  }, []);

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));

    // 重置保存状态
    if (saved) {
      setSaved(false);
    }
  };

  const handleSave = () => {
    // 保存设置到本地存储
    localStorage.setItem('screenshotTranslatorSettings', JSON.stringify(settings));

    // 通知主进程更新快捷键
    window.electronAPI?.updateShortcut?.(settings.shortcutKey);

    // 通知用户保存成功
    setSaved(true);

    // 一段时间后隐藏成功提示
    setTimeout(() => {
      setSaved(false);
    }, 3000);

    console.log('保存设置:', settings);
  };

  const handleReset = () => {
    const defaultSettings: Settings = {
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
      // LLM 配置
      openaiApiKey: '',
      openaiBaseUrl: '',
      openaiModel: 'gpt-4o-mini',
      claudeApiKey: '',
      claudeBaseUrl: '',
      claudeModel: 'claude-3-haiku-20240307',
      geminiApiKey: '',
      geminiModel: 'gemini-1.5-flash',
    };

    setSettings(defaultSettings);
    localStorage.removeItem('screenshotTranslatorSettings');
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
          <label htmlFor="translatorApiKey">{tNested('settings.translation.apiKeyLabel')}</label>
          <input
            type="password"
            id="translatorApiKey"
            value={settings.translatorApiKey}
            onChange={(e) => handleChange('translatorApiKey', e.target.value)}
            placeholder={tNested('settings.translation.apiKeyPlaceholder')}
          />
        </div>

        <div className="setting-item">
          <label htmlFor="translatorRegion">{tNested('settings.translation.regionLabel')}</label>
          <input
            type="text"
            id="translatorRegion"
            value={settings.translatorRegion}
            onChange={(e) => handleChange('translatorRegion', e.target.value)}
            placeholder={tNested('settings.translation.regionPlaceholder')}
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
            onChange={(e) => handleChange('translatorEngine', e.target.value)}
          >
            {TRANSLATOR_ENGINES.map(engine => (
              <option key={engine.code} value={engine.code}>{engine.name}</option>
            ))}
          </select>
        </div>

        {/* Google翻译API设置 */}
        {settings.translatorEngine === 'google' && (
          <div className="setting-item">
            <label htmlFor="googleTranslateApiKey">Google翻译API密钥</label>
            <input
              type="password"
              id="googleTranslateApiKey"
              value={settings.googleTranslateApiKey}
              onChange={(e) => handleChange('googleTranslateApiKey', e.target.value)}
              placeholder="输入Google翻译API密钥"
            />
          </div>
        )}

        {/* 百度翻译API设置 */}
        {settings.translatorEngine === 'baidu' && (
          <>
            <div className="setting-item">
              <label htmlFor="baiduTranslateAppId">百度翻译App ID</label>
              <input
                type="text"
                id="baiduTranslateAppId"
                value={settings.baiduTranslateAppId}
                onChange={(e) => handleChange('baiduTranslateAppId', e.target.value)}
                placeholder="输入百度翻译App ID"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="baiduTranslateAppKey">百度翻译App Key</label>
              <input
                type="password"
                id="baiduTranslateAppKey"
                value={settings.baiduTranslateAppKey}
                onChange={(e) => handleChange('baiduTranslateAppKey', e.target.value)}
                placeholder="输入百度翻译App Key"
              />
            </div>
          </>
        )}

        {/* 有道翻译API设置 */}
        {settings.translatorEngine === 'youdao' && (
          <>
            <div className="setting-item">
              <label htmlFor="youdaoTranslateAppKey">有道翻译App Key</label>
              <input
                type="text"
                id="youdaoTranslateAppKey"
                value={settings.youdaoTranslateAppKey}
                onChange={(e) => handleChange('youdaoTranslateAppKey', e.target.value)}
                placeholder="输入有道翻译App Key"
              />
            </div>
            <div className="setting-item">
              <label htmlFor="youdaoTranslateAppSecret">有道翻译App Secret</label>
              <input
                type="password"
                id="youdaoTranslateAppSecret"
                value={settings.youdaoTranslateAppSecret}
                onChange={(e) => handleChange('youdaoTranslateAppSecret', e.target.value)}
                placeholder="输入有道翻译App Secret"
              />
            </div>
          </>
        )}

        {/* OpenAI 配置 */}
        {settings.translatorEngine === 'openai' && (
          <>
            <div className="setting-item">
              <label htmlFor="openaiApiKey">OpenAI API 密钥</label>
              <input
                type="password"
                id="openaiApiKey"
                value={settings.openaiApiKey}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="openaiBaseUrl">API Base URL (可选)</label>
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

        {/* Claude 配置 */}
        {settings.translatorEngine === 'claude' && (
          <>
            <div className="setting-item">
              <label htmlFor="claudeApiKey">Claude API 密钥</label>
              <input
                type="password"
                id="claudeApiKey"
                value={settings.claudeApiKey}
                onChange={(e) => handleChange('claudeApiKey', e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            <div className="setting-item">
              <label htmlFor="claudeBaseUrl">API Base URL (可选)</label>
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

        {/* Gemini 配置 */}
        {settings.translatorEngine === 'gemini' && (
          <>
            <div className="setting-item">
              <label htmlFor="geminiApiKey">Gemini API 密钥</label>
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
        <h3>OCR设置</h3>

        <div className="setting-item">
          <label htmlFor="ocrLanguage">OCR语言模型</label>
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
            value={settings.fontSize}
            onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
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
            <option value="light">{tNested('settings.languages.lightTheme')}</option>
            <option value="dark">{tNested('settings.languages.darkTheme')}</option>
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