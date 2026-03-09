import { ref } from 'vue';

// Vite env vars only work during build, not at runtime in Electron bundles
// Detect Electron (file:// protocol) and always use localhost for development
const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
// In Electron, we need the full URL. In the browser, use "" so requests go through the Vite proxy (or same-origin in production).
const defaultBase = isElectron ? "http://localhost:3000" : "";

export const apiBase = ref<string>(localStorage.getItem('apiBase') || defaultBase);

export function setApiBase(url: string) {
    apiBase.value = url;
    localStorage.setItem('apiBase', url);
}

export function resetApiBase() {
    localStorage.removeItem('apiBase');
    apiBase.value = defaultBase;
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