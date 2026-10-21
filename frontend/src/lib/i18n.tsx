import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Language, type Translations } from './translations'

const STORAGE_KEY = 'ecowatt-language'

// Espelho do idioma do provider para código fora de componentes (erros da API, PDF demo).
let currentLanguage: Language = 'pt'

export function getCurrentLanguage(): Language {
  return currentLanguage
}

export function localeFor(language: Language): string {
  return language === 'pt' ? 'pt-BR' : 'en-US'
}

const LanguageContext = createContext<{
  language: Language
  setLanguage: (lang: Language) => void
  t: Translations
}>({
  language: 'pt',
  setLanguage: () => {},
  t: translations.pt,
})

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'pt' || stored === 'en') return stored
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  currentLanguage = language

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language)
    document.documentElement.setAttribute('lang', language)
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  return useContext(LanguageContext)
}
