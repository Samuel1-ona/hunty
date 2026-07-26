// This file is loaded by Next.js on the Node.js server side.
// Only run initialisation in a non-browser (server) environment.
import { initErrorTracking } from '@/lib/errorTracking';

if (typeof window === 'undefined') {
  initErrorTracking();
}
