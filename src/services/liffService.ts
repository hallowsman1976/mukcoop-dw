import { LiffUserProfile } from '../types';

declare global {
  interface Window {
    liff?: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      isInClient: () => boolean;
      getOS: () => string;
      getLanguage: () => string;
      getVersion: () => string;
      getProfile: () => Promise<LiffUserProfile>;
      getIDToken: () => string | null;
      login: (config?: { redirectUri?: string }) => void;
      logout: () => void;
      closeWindow: () => void;
      sendMessages: (messages: unknown[]) => Promise<void>;
      openWindow: (params: { url: string; external?: boolean }) => void;
    };
  }
}

export interface LiffStatus {
  isReady: boolean;
  isInClient: boolean;
  isLoggedIn: boolean;
  os: string;
  liffId: string;
  profile: LiffUserProfile | null;
  error?: string;
}

export const LiffService = {
  status: {
    isReady: false,
    isInClient: false,
    isLoggedIn: false,
    os: 'web',
    liffId: '',
    profile: null,
  } as LiffStatus,

  async init(customLiffId?: string): Promise<LiffStatus> {
    const liffId = customLiffId || localStorage.getItem('line_liff_id_v1') || '';
    this.status.liffId = liffId;

    if (!window.liff) {
      this.status.isReady = true;
      this.status.os = 'web-browser (No SDK)';
      return this.status;
    }

    if (!liffId) {
      // Running in sandbox / simulator mode
      this.status.isReady = true;
      this.status.os = 'sandbox-web';
      return this.status;
    }

    try {
      await window.liff.init({ liffId });
      this.status.isReady = true;
      this.status.isInClient = window.liff.isInClient();
      this.status.os = window.liff.getOS();
      this.status.isLoggedIn = window.liff.isLoggedIn();

      if (this.status.isLoggedIn) {
        const profile = await window.liff.getProfile();
        this.status.profile = profile;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.status.isReady = true;
      this.status.error = errorMsg;
    }

    return this.status;
  },

  /** LIFF ID token (JWT) the backend verifies with LINE. Undefined outside LINE / when not logged in. */
  getIdToken(): string | undefined {
    if (window.liff && this.status.liffId && this.status.isLoggedIn) {
      const token = window.liff.getIDToken();
      if (!token) return undefined;
      // LIFF caches the ID token (valid ~1 hour); an expired one is rejected by LINE and breaks auto sign-in.
      try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 30000) return undefined;
      } catch {
        // undecodable: let the server decide
      }
      return token;
    }
    return undefined;
  },

  async login(redirectUri?: string) {
    if (window.liff && this.status.liffId) {
      window.liff.login({ redirectUri: redirectUri || window.location.href });
    }
  },

  logout() {
    if (window.liff && window.liff.isLoggedIn()) {
      window.liff.logout();
      this.status.isLoggedIn = false;
      this.status.profile = null;
    }
  },

  closeWindow() {
    if (window.liff && window.liff.isInClient()) {
      window.liff.closeWindow();
    }
  },

  async sendFlexMessage(flexBubble: unknown): Promise<boolean> {
    if (window.liff && window.liff.isInClient()) {
      try {
        await window.liff.sendMessages([flexBubble]);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};
