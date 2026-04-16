import { ref } from 'vue';
import { io, Socket } from 'socket.io-client'; // used for socket functionallity
import { apiFetch, apiBase } from './useApi';

// defines the chunk storage
export const aiChunks = ref<string[]>([]);

export let socket: Socket | null =null;

const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";

async function checkSession(): Promise<boolean> {
    // In Electron mode, the backend auto-authenticates every request
    if (isElectron) return true;

    console.log("Checking JWT");

    const res = await apiFetch('/api/auth/check');
    const data = await res.json();
    console.log("Session: ", data);

    if (data.isAuth) return true;

    // try refresh once
    const refreshed = await tryRefresh();
    if (!refreshed) return false;

    // re-check session after refresh
    const res2 = await apiFetch('/api/auth/check');
    const data2 = await res2.json();
    return data2.isAuth;
}

async function tryRefresh(): Promise<boolean> {
    try {
        const res = await apiFetch('/api/auth/refresh/token', { method: 'GET' });
        if (!res.ok) {
            console.warn('Refresh failed, status', res.status);
            return false;
        }
        console.log('Refresh succeeded');
        return true;
    } catch (err) {
        console.error('Refresh error', err);
        return false;
    }

}

// creates socket
async function createSocket(): Promise<Socket | null> {
    console.log("Attempting to connect to WebSocket...");
    const isAuth = await checkSession();
    if (!isAuth) {
        console.warn("Not authenticated, skipping socket connection.");
        return null;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || apiBase.value;
    const s = io(socketUrl, {
        withCredentials: true
    });

    s.on('connect', () => {
        console.log("Socket connected:", s.id);
    });

    // on response 'ai_chunk' save content to aiChunks
    s.on('ai_chunk', (content: string) => {
        aiChunks.value.push(content);
    });

    s.on('disconnect', async (reason: string) => {
        if (reason === "io server disconnect" || reason === "io client disconnect" || reason === "transport close") {

            console.log("Socket disconnected");
            // wait a moment before reconnecting
            setTimeout(async () => {
                const ok = await checkSession();
                if (ok) {
                    socket = await createSocket();
                }
            }, 1000);
        }
    });

    s.on('connect_error', async (err: Error) => {
        console.error("Socket connection error:", err);
        // attempt to refresh tokens once then reconnect
        const ok = await tryRefresh();
        if (ok) {
            console.log('Reconnecting socket after refresh');
            try {
                s.connect();
            } catch (e) {
                console.error('Reconnect failed', e);
            }
        }
    });

    return s;
}

// connects the client to the websocket connection at the api's gateway
export async function connectSocket(): Promise<Socket | null> {
    if (!socket || !socket.connected) {
        console.log("Creating new socket connection")
        socket = await createSocket();
    }
    return socket;
}

// sends prompt messages with the model object attached.
export async function sendPrompt(thread: number, message: object, model: { modelFullName: string, thinkingLevel?: any }, fileIds: number[], idGroup: number): Promise<void> {
    console.log("Sending prompt:", { thread, message, model });
    aiChunks.value = [];

    if (!socket || !socket.connected) {
        await connectSocket();
    }

    if (socket && socket.connected) {
        console.log("Emitting prompt on socket id:", socket.id);
        socket.emit('prompt', { thread, message, model, idGroup, fileIds });
    } else {
        throw new Error('Socket not connected, call connectSocket() first');
    }
}

export interface PromptHandlers {
    onChunk: (chunk: string) => void;
    onThinkingChunk: (chunk: string) => void;
    onThinkingComplete: () => void;
    onComplete: () => void;
    onError: (err: any) => void;
    onFileProgress?: (progress: { current: number; total: number; fileName: string }) => void;
    onFileProgressComplete?: (info: { total: number }) => void;
}

// Connects, registers all event listeners, emits the prompt, and returns a cleanup function.
export async function sendPromptWithHandlers(
    thread: number,
    message: object,
    model: { modelFullName: string, thinkingLevel?: any },
    fileIds: number[],
    idGroup: number,
    handlers: PromptHandlers
): Promise<() => void> {
    await connectSocket();
    if (!socket) {
        throw new Error('Socket not connected');
    }

    const cleanup = () => {
        socket?.off('ai_chunk', handlers.onChunk);
        socket?.off('ai_thinking_chunk', handlers.onThinkingChunk);
        socket?.off('ai_thinking_complete', handlers.onThinkingComplete);
        socket?.off('ai_complete', handlers.onComplete);
        socket?.off('error', handlers.onError);
        socket?.off('connect_error', handlers.onError);
        if (handlers.onFileProgress) socket?.off('file_progress', handlers.onFileProgress);
        if (handlers.onFileProgressComplete) socket?.off('file_progress_complete', handlers.onFileProgressComplete);
    };

    socket.on('ai_chunk', handlers.onChunk);
    socket.on('ai_thinking_chunk', handlers.onThinkingChunk);
    socket.once('ai_thinking_complete', handlers.onThinkingComplete);
    socket.once('ai_complete', handlers.onComplete);
    socket.once('error', handlers.onError);
    socket.once('connect_error', handlers.onError);
    if (handlers.onFileProgress) socket.on('file_progress', handlers.onFileProgress);
    if (handlers.onFileProgressComplete) socket.once('file_progress_complete', handlers.onFileProgressComplete);

    aiChunks.value = [];
    console.log("Sending prompt:", { thread, message, model });
    console.log("Emitting prompt on socket id:", socket.id);
    socket.emit('prompt', { thread, message, model, idGroup, fileIds });

    return cleanup;
}

// Abort a running prompt stream
export function abortPrompt(): void {
    if (socket && socket.connected) {
        socket.emit('abort');
    }
}


// // handle the ai prompt to send
// export function useSocket() {

//     const aiChunks = ref([]);
//     const isLoading = ref(false);



//     let socket = null

//     function connectSocket() {
//         if (!socket) {
//             socket = io('http://localhost:3000', {
//                 withCredentials: true
//             });
//         }

//         socket.on('ai_chunk', (content) => {
//             aiChunks.value.push(content);
//         })

//         return socket;

//     }

//     function sendPrompt(thread, message, string, model) {

//         isLoading.value = true;
//         aiChunks.value=[];

//         if (socket) {
//             socket.emit('prompt', {thread, message, model});
//         } else {
//             throw new Error('Socket not connected, call connectSocket() first');
//         }
//     }


//   return { socket, aiChunks, sendPrompt, connectSocket };
// }