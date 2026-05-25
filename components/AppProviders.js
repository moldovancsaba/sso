import { Box, DirectionProvider, MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import AppFooter from './AppFooter'
import { GdsI18nContext } from '../lib/ui/gdsI18n'
import { mantineTheme } from '../lib/ui/mantineTheme'
import packageJson from '../package.json'

export default function AppProviders({
  children,
  locale = 'en',
  messages = {},
}) {
  const isRtl = ['ar', 'he'].includes(locale)
  const dir = isRtl ? 'rtl' : 'ltr'

  return (
    <DirectionProvider initialDirection={dir}>
      <GdsI18nContext.Provider value={{ locale, messages }}>
        <MantineProvider
          defaultColorScheme="light"
          theme={mantineTheme}
          withCssVariables
          withGlobalClasses
        >
          <ModalsProvider>
            <Notifications position="top-right" />
            <Box dir={dir} h="100%" pb={48}>
              {children}
              <AppFooter version={packageJson.version} />
            </Box>
          </ModalsProvider>
        </MantineProvider>
      </GdsI18nContext.Provider>
    </DirectionProvider>
  )
}
