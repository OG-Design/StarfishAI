import { ref } from 'vue';

// Vite env vars only work during build, not at runtime in Electron bundles
// Detect Electron (file:// protocol) and always use localhost for development
const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
// Build the default base URL from VITE_SECURE and VITE_HOST env vars
const protocol = import.meta.env.VITE_SECURE === 'true' ? 'https' : 'http';
const host = import.meta.env.VITE_HOST || 'localhost';
// In Electron, we need the full URL. In the browser, use "" so requests go through the Vite proxy (or same-origin in production).
const defaultBase = isElectron ? (import.meta.env.VITE_API_URL || `${protocol}://${host}:3000`) : "";

export const apiBase = ref<string>(localStorage.getItem('apiBase') || defaultBase);

export function setApiBase(url: string) {
    apiBase.value = url;
    localStorage.setItem('apiBase', url);
}

export function resetApiBase() {
    localStorage.removeItem('apiBase');
    apiBase.value = defaultBase;
}

// When the remote app loads via a ?returnTo= param, capture it into localStorage
// so the Reset button can navigate back to the originating host.
(function captureReturnTo() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (returnTo) {
        localStorage.setItem('homeUrl', returnTo);
        // Strip the param from the URL without reloading
        params.delete('returnTo');
        const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', clean);
    }
})();

/** Navigate back to wherever we came from (set via ?returnTo on arrival). */
export function navigateHome() {
    const home = localStorage.getItem('homeUrl') || `${protocol}://${host}`;
    localStorage.removeItem('homeUrl');
    window.location.href = home;
}

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    console.log('apiBase:', apiBase.value);
    try {
        const fetcher = fetch(`${apiBase.value}${path}`, { 
            credentials: 'include', 
            ...options
        });
        return fetcher
    } catch (err) {
        console.error("Error occurred in apiFetch():", err);
        return Promise.reject(err);
    }
    
}