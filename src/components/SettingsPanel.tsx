import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';

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
    theme: 'light'
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

    // 通知用户保存成功
    setSaved(true);

    // 一段时间后隐藏成功提示
    setTimeout(() => {
      setSaved(false);
    }, 3000);

    // 在实际应用中，这里还应该更新快捷键和其他设置
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
      theme: 'light'
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