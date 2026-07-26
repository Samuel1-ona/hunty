// This file is loaded by Next.js on the browser/client side before the app
// renders. It initialises the error tracking system (Sentry when a DSN is
// configured, console logger otherwise).
import { initErrorTracking } from '@/lib/errorTracking';

initErrorTracking();
