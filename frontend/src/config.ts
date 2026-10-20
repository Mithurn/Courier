export const LIVE_APP_ORIGIN = import.meta.env.VITE_LIVE_APP_ORIGIN ?? 'https://mithurnscourier.duckdns.org';

export const liveAppUrl = (path: string) => `${LIVE_APP_ORIGIN}${path}`;
