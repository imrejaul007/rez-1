import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * HTML Document customization for web platform
 * SEO, PWA, responsive desktop, analytics
 */
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* SEO & Social sharing meta tags */}
        <title>Rez - Earn, Save & Shop Smarter</title>
        <meta name="description" content="Rez is your all-in-one rewards and shopping platform. Earn coins, discover deals, and shop from local stores." />
        <meta property="og:title" content="Rez - Earn, Save & Shop Smarter" />
        <meta property="og:description" content="Discover deals, earn rewards, and shop from local stores with Rez." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.rezapp.com/og-image.png" />
        <meta property="og:url" content="https://www.rezapp.com" />
        <meta property="og:site_name" content="Rez" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rez - Earn, Save & Shop Smarter" />
        <meta name="twitter:description" content="Discover deals, earn rewards, and shop from local stores with Rez." />
        <meta name="twitter:image" content="https://www.rezapp.com/og-image.png" />
        <meta name="theme-color" content="#1a3a52" />

        {/* India market & geo targeting */}
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        <meta property="og:locale" content="en_IN" />

        {/* App install banners */}
        <meta name="apple-itunes-app" content="app-id=com.rez.app" />
        <meta name="google-play-app" content="app-id=com.rez.app" />

        {/* PWA support */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Google Analytics */}
        {process.env.EXPO_PUBLIC_GA_TRACKING_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.EXPO_PUBLIC_GA_TRACKING_ID}`}
            />
            <script dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.EXPO_PUBLIC_GA_TRACKING_ID}');
            `}} />
          </>
        )}

        {/* Responsive desktop layout + body reset */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            margin: 0;
            padding: 0;
            background-color: #f0f0f0;
          }
          #root {
            max-width: 480px;
            margin: 0 auto;
            background-color: #ffffff;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.08);
          }
          @media (max-width: 480px) {
            #root {
              max-width: 100%;
              box-shadow: none;
            }
            body {
              background-color: #ffffff;
            }
          }
        `}} />

        {/* Expo's ScrollView reset for web */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
