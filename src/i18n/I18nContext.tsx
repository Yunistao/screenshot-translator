import React, { createContext, useContext, useState, ReactNode } from 'react';
import { zhCN } from './zh-CN';

// 支持的语言类型
export type Locale = 'zh-CN'; // 可以扩展支持更多语言

// 翻译键类型
export type TranslationKeys = keyof typeof zhCN;

// 国际化上下文类型
interface I18nContextType {
  locale: Locale;
  t: (key: TranslationKeys) => string;
  tNested: (nestedKey: string) => string;
  setLocale: (locale: Locale) => void;
}

// 创建国际化上下文
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// 翻译数据映射
const translations = {
  'zh-CN': zhCN
};

// 国际化提供者组件
export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('zh-CN');

  // 翻译函数 - 支持嵌套键，例如 'settings.title'
  const tNested = (nestedKey: string): string => {
    const keys = nestedKey.split('.');
    let result: any = translations[locale];

    for (const key of keys) {
      if (result && typeof result === 'object') {
        result = result[key];
      } else {
        return nestedKey; // 如果找不到对应的翻译，返回原键
      }
    }

    return typeof result === 'string' ? result : nestedKey;
  };

  // 顶层翻译函数
  const t = (key: TranslationKeys): string => {
    const result = translations[locale][key];
    return typeof result === 'string' ? result : key;
  };

  return (
    <I18nContext.Provider value={{ locale, t, tNested, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

// 使用国际化钩子
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};