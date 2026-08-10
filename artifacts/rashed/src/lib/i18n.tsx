import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

type Lang = 'ar' | 'en';
type Translations = typeof ar;

const translations: Record<Lang, Translations> = { ar, en };

interface I18nContextValue {
  lang: Lang;
  t: (key: keyof Translations) => string;
  setLang: (lang: Lang) => void;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('rashed_lang');
    return (stored === 'ar' || stored === 'en') ? stored : 'ar';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('rashed_lang', l);
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: keyof Translations): string => {
    return translations[lang][key] ?? translations['ar'][key] ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, t, setLang, dir: lang === 'ar' ? 'rtl' : 'ltr', isRtl: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
