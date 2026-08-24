import { Head, Html, Main, NextScript } from 'next/document';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

export default function Document() {
  return (
    <Html lang="en" {...mantineHtmlProps}>
      <Head>
        <ColorSchemeScript defaultColorScheme="light" />
        {/*
          WHAT: Load the two families lib/theme/mantineTheme.js names as fontFamily and
                fontFamilyMonospace.
          WHY: These used to arrive via an `@import url(...)` at the top of
               styles/globals.css. That file was deleted (every selector in it was dead),
               and the import was its only living part - dropping it silently would have
               fallen the whole product back to system fonts. A <link> here is also
               strictly better than the CSS @import it replaces: an @import cannot start
               downloading until the stylesheet containing it has itself been fetched and
               parsed, so the fonts were serialized behind it.
          NOTE: Both hosts are already permitted by the CSP in lib/securityHeaders.mjs
                (fonts.googleapis.com in style-src, fonts.gstatic.com in font-src).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
