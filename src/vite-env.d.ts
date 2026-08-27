/// <reference types="vite/client" />

interface Window {
  dataLayer?: unknown[][];
}

interface Window {
  gtag?: (...args: unknown[]) => void;
  adsbygoogle: unknown[];
}
