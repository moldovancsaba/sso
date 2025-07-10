import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import SSOErrorBoundary from '../components/SSOErrorBoundary';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SSOErrorBoundary>
      <SessionProvider session={pageProps.session}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>SSO</title>
        </Head>
        <Component {...pageProps} />
      </SessionProvider>
    </SSOErrorBoundary>  
  );
}
