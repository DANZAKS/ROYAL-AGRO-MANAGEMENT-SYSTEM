import { useSyncExternalStore } from 'react';
import { NetworkStatusType } from './types';

type NetworkChangeListener = () => void;

const listeners: Set<NetworkChangeListener> = new Set();

let isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
let currentNetworkStatus: NetworkStatusType = isOnlineState ? 'ONLINE' : 'OFFLINE';

let snapshot: { isOnline: boolean; status: NetworkStatusType } = {
  isOnline: isOnlineState,
  status: currentNetworkStatus
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnlineState = true;
    currentNetworkStatus = 'ONLINE';
    snapshot = { isOnline: true, status: 'ONLINE' };
    notifyListeners();
  });

  window.addEventListener('offline', () => {
    isOnlineState = false;
    currentNetworkStatus = 'OFFLINE';
    snapshot = { isOnline: false, status: 'OFFLINE' };
    notifyListeners();
  });
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error(e);
    }
  });
}

export function setGlobalNetworkStatus(status: NetworkStatusType) {
  currentNetworkStatus = status;
  if (status === 'OFFLINE') {
    isOnlineState = false;
  } else if (status === 'ONLINE' || status === 'SYNCED') {
    isOnlineState = true;
  }
  snapshot = { isOnline: isOnlineState, status: currentNetworkStatus };
  notifyListeners();
}

export function getNetworkStatus(): { isOnline: boolean; status: NetworkStatusType } {
  return snapshot;
}

export function subscribeNetworkStatus(listener: NetworkChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNetworkStatus(): { isOnline: boolean; status: NetworkStatusType } {
  return useSyncExternalStore(
    subscribeNetworkStatus,
    () => snapshot,
    () => snapshot
  );
}

