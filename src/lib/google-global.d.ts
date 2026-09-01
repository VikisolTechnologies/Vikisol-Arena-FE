// Shared ambient shape for window.google - both Google Identity Services (GoogleSignInButton)
// and the Maps JS API (GoogleMapView) can load onto the same global object, so one declaration
// here avoids the two components' `declare global` blocks conflicting with each other.
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
      maps: typeof google.maps;
    };
    initArenaMap?: () => void;
  }
}
