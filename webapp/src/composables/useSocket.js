const socketUrl = import.meta.env.VITE_SOCKET_URL;


import { ref } from 'vue';
import { io } from 'socket.io-client'; // used for socket functionallity

// defines the chunk storage
export const aiChunks = ref([]);

export let socket=null;

async function checkJWT() {
    console.log("Checking JWT");

    const res = await fetch('/api/auth/check');

    const data = await res.json();


    console.log("JWT:", data.jwt);

    if (data && data.jwt) {
        return data.jwt;
    }

    authenticated.value = data.isAuth;

    console.log("Session: ", await data);
}

// creates socket
async function createSocket() {
    const token = await checkJWT();
    if (!token) {
        console.warn("No JWT available for the socket connection.");
        return null
    }

    const s = io(socketUrl, {
        withCredentials: true,
        auth: { token }
    });

    s.on('connect', () => {
        console.log("Socket connected:", s.id);
    });

    // on response 'ai_chunk' save content to aiChunks
    s.on('ai_chunk', (content) => {
        aiChunks.value.push(content);
    });

    s.on('disconnect', async (reason) => {
        if (reason === "io server disconnect" || reason === "io client disconnect" || reason === "transport close") {

            console.log("Socket disconnected");
            // wait a moment before reconnecting
            setTimeout(async () => {
                const newToken = await checkJWT();
                if (newToken) {
                    s.auth = {token: newToken};
                    socket = await createSocket();
                }
            }, 1000);
        }
    });

    s.on('connect_error', (err) => {
        console.error("Socket connection error:", err);
    });

    return s;
}

// connects the client to the websocket connection at the api's gateway
export async function connectSocket() {
    if (!socket || !socket.connected) {
        console.log("Creating new socket connection")
        socket = await createSocket();
    }
    return socket;
}

// sends prompt messages with the model name attached.
export async function sendPrompt(thread, message, model) {
    console.log("Sending prompt: ", message)
    // refresh chunk storage
    aiChunks.value = [];


    if(!socket || !socket.connected) {
        await connectSocket();
    }

    // checks the socket connection, if socket, emit the prompt 'method'
    if (socket && socket.connected) {
        console.log("Emitting prompt on socket id:", socket.id);
        socket.emit('prompt', {thread, message, model});
    } else {
        throw new Error('Socket not connected, call connectSocket() first');
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