import { getPendingCount } from './offlineQueue';

export interface PwaStatusInfo {
  version: string;
  isInstalled: boolean;
  isStandalone: boolean;
  swRegistered: boolean;
  swState: string;
  cacheName: string;
  hasUpdateAvailable: boolean;
  pendingCount: number;
}

let deferredInstallPrompt: any = null;
let swRegistrationRef: ServiceWorkerRegistration | null = null;
let updateAvailableState = false;

// Listen for PWA Install Prompt Event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('royal_agro_pwa_installable', { detail: true }));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('royal_agro_pwa_installed'));
  });
}

/**
 * Register Service Worker & handle updates safely
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      swRegistrationRef = reg;
      console.log('[PWA Manager] Service Worker registered with scope:', reg.scope);

      // Check for SW update
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateAvailableState = true;
            console.log('[PWA Manager] New application version available!');
            window.dispatchEvent(new CustomEvent('royal_agro_pwa_update_available', { detail: true }));
          }
        });
      });
    }).catch((err) => {
      console.error('[PWA Manager] SW registration failed:', err);
    });

    // Handle controller change (when new SW takes over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

/**
 * Checks if app is running in Standalone PWA mode
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isNavStandalone = (navigator as any).standalone === true;
  return isDisplayStandalone || isNavStandalone;
}

/**
 * Prompt user to install PWA if supported
 */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }

  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('royal_agro_pwa_installable', { detail: false }));
    return outcome === 'accepted';
  } catch (err) {
    console.error('Error prompting PWA install:', err);
    return false;
  }
}

/**
 * Activate available SW update safely
 */
export function applyPwaUpdate() {
  if (swRegistrationRef && swRegistrationRef.waiting) {
    swRegistrationRef.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

/**
 * Check whether there is unsynced pending offline data in IndexedDB
 */
export async function hasUnsyncedPendingData(): Promise<boolean> {
  const count = await getPendingCount();
  return count > 0;
}

/**
 * Retrieve comprehensive PWA diagnostics
 */
export async function getPwaDiagnostics(): Promise<PwaStatusInfo> {
  const pendingCount = await getPendingCount();
  const isInstalled = isStandaloneMode();
  const isStandalone = isInstalled;

  let swRegistered = false;
  let swState = 'Not Active';

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    swRegistered = !!navigator.serviceWorker.controller;
    swState = navigator.serviceWorker.controller ? 'Active (Running)' : 'Registering...';
  }

  return {
    version: '1.0.0',
    isInstalled,
    isStandalone,
    swRegistered,
    swState,
    cacheName: 'royal-agro-shell-v2',
    hasUpdateAvailable: updateAvailableState,
    pendingCount
  };
}
