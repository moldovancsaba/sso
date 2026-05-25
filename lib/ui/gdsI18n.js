import { createContext, useContext } from 'react'

export const GdsI18nContext = createContext({
  locale: 'en',
  messages: {},
})

export function useGdsTranslation() {
  const { locale, messages } = useContext(GdsI18nContext)

  return {
    locale,
    t: (id, defaultMessage) => messages[id] || defaultMessage,
  }
}
