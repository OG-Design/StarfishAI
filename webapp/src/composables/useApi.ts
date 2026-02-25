// Vite env vars only work during build, not at runtime in Electron bundles
// Detect Electron (file:// protocol) and always use localhost for development
const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
export const API_BASE = isElectron ? "http://localhost:3000" : (import.meta.env.VITE_API_URL || "http://localhost:3000");

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
    console.log('API_BASE:', API_BASE);
    try {
        const fetcher = fetch(`${API_BASE}${path}`, { 
            credentials: 'include', 
            ...options
        });
        return fetcher
    } catch (err) {
        console.error("Error occurred in apiFetch():", err);
        return Promise.reject(err);
    }
    
}