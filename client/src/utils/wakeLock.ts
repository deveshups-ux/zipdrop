/**
 * Screen Wake Lock Utility
 * Prevents mobile and desktop devices from sleeping/dimming during active P2P transfers.
 * Automatically handles tab visibility changes to re-acquire the lock when returning to the tab.
 */

class WakeLockManager {
  private sentinel: any | null = null;
  private isActive = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = async () => {
    // If the tab becomes visible again and a transfer was active, re-acquire the lock
    if (this.isActive && document.visibilityState === 'visible') {
      await this.acquire();
    }
  };

  /**
   * Request screen wake lock
   */
  public async acquire(): Promise<boolean> {
    this.isActive = true;

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      console.log('[WakeLock] Screen Wake Lock API not supported on this browser.');
      return false;
    }

    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');

      this.sentinel.addEventListener('release', () => {
        console.log('[WakeLock] Screen Wake Lock was released.');
        this.sentinel = null;
      });

      console.log('☀️ [WakeLock] Screen Wake Lock acquired. Device will stay awake.');
      return true;
    } catch (err) {
      console.warn('[WakeLock] Failed to acquire screen wake lock:', err);
      return false;
    }
  }

  /**
   * Release screen wake lock when transfer completes or is cancelled
   */
  public async release(): Promise<void> {
    this.isActive = false;

    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch (err) {
        console.warn('[WakeLock] Error releasing wake lock:', err);
      } finally {
        this.sentinel = null;
        console.log('🌙 [WakeLock] Screen Wake Lock released. Normal power state restored.');
      }
    }
  }

  /**
   * Check if Wake Lock is supported
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }
}

export const wakeLockManager = new WakeLockManager();
