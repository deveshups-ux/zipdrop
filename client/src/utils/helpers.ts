export const CHUNK_SIZE = 16384; // 16 KB per WebRTC packet (safe threshold across all browsers)

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getDeviceDetails(): { deviceName: string; deviceType: 'mobile' | 'desktop' | 'tablet' } {
  const ua = navigator.userAgent;
  let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Extract OS/Browser friendly name
  let os = 'Unknown Device';
  if (ua.indexOf('Win') !== -1) os = 'Windows PC';
  else if (ua.indexOf('Mac') !== -1) os = 'MacBook';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux PC';
  else if (ua.indexOf('Android') !== -1) os = 'Android Phone';
  else if (ua.indexOf('iPhone') !== -1) os = 'iPhone';
  else if (ua.indexOf('iPad') !== -1) os = 'iPad';

  return {
    deviceName: os,
    deviceType,
  };
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZIP-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Security: Sanitize untrusted filenames received over the network
 * Prevents Directory Traversal (../), control characters, and injection
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return `file_${Date.now()}`;
  // 1. Remove dangerous path traversal & reserved filesystem characters
  let clean = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  clean = clean.replace(/\.\./g, '_');
  // 2. Strip non-printable / control characters
  clean = clean.replace(/[\x00-\x1f\x80-\x9f]/g, '');
  // 3. Trim whitespace
  clean = clean.trim();
  // 4. Max length protection (255 chars limit across Windows/Linux/macOS)
  if (clean.length > 255) {
    const extIndex = clean.lastIndexOf('.');
    if (extIndex !== -1 && extIndex > 240) {
      const ext = clean.substring(extIndex);
      clean = clean.substring(0, 255 - ext.length) + ext;
    } else {
      clean = clean.substring(0, 255);
    }
  }
  return clean || `file_${Date.now()}`;
}
