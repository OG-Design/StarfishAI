# Starfish web UI

Starfish web UI is a user interface that allows for running LLM's locally, or through the backend API provided in the project folder.

# Prerequisites & compatibility

## Ports needed
- `5173` -> for the webapp, Will make a config file: W.I.P 22.01.26
- `3000` -> for the API, Will make a config file: W.I.P 22.01.26

## Software needed to run the program

Just the webapp

- node.js -> version: v22.15.0 - v.24.13.0 (LTS)
- npm: Node Package Manager -> version: 11.6.2

If you run the API on device

- docker
- docker-compose
- ollama


# Getting started webapp only

- Install `node.js v22.15.0 - 24.13.0 (LTS)` & `npm` [https://nodejs.org/en/download](https://nodejs.org/en/download)

## Install required modules
```bash
npm install
```

## Run the UI
By default this will run on port `:5173`, change this in [vite.config.ts](vite.config.ts) aswell as in the backends [PORT_WEBAPP](../api-nest/src/chatevent/chatevent.gateway.ts). It also runs on `http://localhost`, so if you get cross origin problems try to change it in [vite.config.ts](vite.config.ts), aswell as in the backends [ADDRESS_HOST](../api-nest/src/chatevent/chatevent.gateway.ts)

### Command to run the webapp
```bash
npm run dev
```

# How it works

## File structure
```bash
webapp
|- public
|- src
|   |--- App.vue
|   |--- main.ts
|   |--- style.css
|   |--- assets
|   |--- components
|           |--- Login.vue
|           |--- OpenThread.vue
|           |--- ThreadMenuChild.vue
|           |--- ThreadMenu.vue
|- README.md
```

# Overview of how the scripts work

### App.vue [*Link*](./src/App.vue)

Underneath is a code snippet of the script, it may change.

```vue
<script setup lang="ts">

import ThreadsMenu from './components/ThreadsMenu.vue'
import OpenThread from './components/OpenThread.vue';
import Login from './components/Login.vue';

import {ref} from 'vue'

// imports selectedThread type
import type {selectedThread} from './types/selectedThread'

// imports threadsAvailable from a globally available type between api and webapp
import type thread from '../../types/thread';

// make authenticated state ref
const authenticated = ref(false);

// Make threads storage
const threadsAvailable = ref<thread[]>([]);

// console.log(threadsAvailable.value);

// creates reference selectedThread
const selectedThread = ref();
selectedThread.value = {idThread:0};

// fetch all threads available to user
async function getAllThreads() {
  const res = await fetch('/api/ai/thread/all');
  const data = await res.json();

  // console.log(data);

  threadsAvailable.value = data;

  console.log("Threads available: \n", threadsAvailable.value);
}

// check if there is a valid session
async function checkSession() {
  const res = await fetch('/api/auth/check');

  const loggedIn = await res.json();

  // change the authenticated value to true or false based on result
  authenticated.value = !!(loggedIn && loggedIn.isAuth);

  // get threads if authenticated
  if (authenticated.value) {
    getAllThreads();
    return;
  }

  // console.log("Session: ", await data);
}

// run session check on app start
checkSession();

// Open thread by updating selectedThreads value
function handleOpenThread_inParent(payload: thread) {
  console.log("Running ", handleOpenThread_inParent);

  // console.log(payload);

  selectedThread.value = {idThread: payload.idThread, title: payload.title};

  console.log("Thread selected:", selectedThread.value);

  // console.log(selectedThread.value);
  // console.log(selectedThread.value.idThread);

}

// Updates the UI's threadTitle
function handleUpdateThreadTitle({idThread, title}: thread) {
  const thread = threadsAvailable.value.find(t=>t.idThread===idThread);
  if (thread) thread.title=title;
}

// updates the thread selection on login
function handleUpdateThreadsAvailable(payload: object = {empty: "empty"}) {
  console.log("Update threads:", payload);
  getAllThreads();
}

</script>

<template>
  <!-- Handles login -->
  <Login v-if="!authenticated" :authenticated="authenticated" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>

  <!-- Handles thread selection through handleOpenThread_inParent and in child as handleOpenThread -->
  <ThreadsMenu :threadsAvailable="threadsAvailable" @openThread="handleOpenThread_inParent" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>

  <!-- Contains the open thread -->
  <OpenThread v-if="authenticated" :title="selectedThread.title || 'No thread selected'" :index="selectedThread.idThread || null" :idThread="selectedThread.idThread" :key="selectedThread.idThread" @updateThreadTitle="handleUpdateThreadTitle"/>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>

```

---

#### `<Login/>` component overview
The login component handles the login state aswell as the registration of new users if it is enabled in the *API*

```vue
<!-- Handles login -->
<Login v-if="!authenticated" :authenticated="authenticated" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>
```

The `v-if="!authenticated"` parameter checks wether or not the user is authenticated, if the user isn't authenticated with the API it displays it. The second parameter `:authenticated="authenticated"` Makes sure the global authenticated value is always updated, The way this is done is with an emit event from inside the of the component. The third parameter `@updateThreadsAvailable="handleUpdateThreadsAvailable"` is responsible for updating the threads available to the user. This is required due to the updated login state.

---

#### `<ThreadMenu/>` component overview
The thread menu component handles all the available threads, aswell as their delete and creation functionalities.

```vue
<!-- Handles thread selection through handleOpenThread_inParent and in child as handleOpenThread -->
<ThreadsMenu :threadsAvailable="threadsAvailable" @openThread="handleOpenThread_inParent" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>
```

The first parameter `:threadsAvailable="threadsAvailable"` gathers the result of the `threadsAvailable = ref<thread[]>([])` reference and inputs it into the `threadsAvailable` prop, which is further used within the component to render each thread's title. The second parameter `@openThread="handleOpenThread_inParent"` Is responsible for sending the openThread signal to the reference called `selectedThread = ref();`. selected thread is then used in the `<OpenThread/>` component, we'll come back to that later. The third parameter `@updateThreadsAvailable="handleUpdateThreadsAvailable"` is responsible for updating the thread availability in the UI, this time it is used when the threads are deleted or created in the thread menu.

---

#### `<OpenThread/>` component overview

The open thread component handles the currently selected thread, it fetches the messages, and handles prompts.

```vue
<OpenThread v-if="authenticated" :title="selectedThread.title || 'No thread selected'" :index="selectedThread.idThread || null" :idThread="selectedThread.idThread" :key="selectedThread.idThread" @updateThreadTitle="handleUpdateThreadTitle"/>
```

The first parameter `v-if="authenticated"` only renders the component if the user is authenticated. The second parameter `:title="selectedThread.title || 'No thread selected'"` is responsible for the throughput of the title. The third parameter `:index="selectedThread.idThread || null"` handles the selection of the current thread. The fourth parameter `:key="selectedThread.idThread"` Makes sure the open thread updates between the movement of different threads. And last but not least the `@updateThreadTitle="handleUpdateThreadTitle"` is responsible for handling the updated title.

---

### Login.vue [*Link*](./src/components/Login.vue)

The login script is responsible for handling session checking, and login and registration. Underneath is a snipet of the code, this may change. To understand what this code does read the comments.

```vue
<script setup lang="ts">

import { connect } from 'socket.io-client';
import {ref, onMounted, watch} from 'vue'

// used to make a socket connection.
import { connectSocket } from '../composables/useSocket';

// define props
const props = defineProps({
    authenticated: Boolean
});


// Reference authenticated as props.authenticated to decide if login should show
let authenticated = ref(props.authenticated);

// login / register value store
let username = ref('');
let password = ref('');
let register_username = ref('');
let register_password = ref('');
let register_password_confirm = ref('');

const isRegisterable = ref(false);


// Emit signals out of this component as named in array elements
const emit = defineEmits(['updateThreadsAvailable', 'authenticated']);

// watch props.authenticated for change, on change: change authenticated value to val
watch(()=> props.authenticated,
    (val: any) => {
    authenticated.value = val;
});


onMounted(async () => {

    // check session
    async function checkSession() {
        const res = await fetch('/api/auth/check', {
            credentials: 'include'
        });

        const data = await res.json();

        console.log(data.isAuth);

        if (data) {
            // change local and global variable to data.isAuth
            authenticated.value = data.isAuth;
            emit('authenticated', data.isAuth);
            return;
        }

        // authenticated.value = data.isAuth;

        console.log("Session: ", await data);
    }

    checkSession();

    try {
        // Connect to the socket
        connectSocket();
    } catch (err) {
        console.error("Error connecting to socket:", err)
    }

    // check id the API user regiserability is active
    const checkRegisterability = await fetch("/api/user/isRegisterable");
    const res = await checkRegisterability.json();

    if (res.isRegisterable==undefined) {
        isRegisterable.value = false
    }

    // Assign isRegistarable the api's response value
    isRegisterable.value = res.isRegisterable;

});

// Handles login
async function handleLogin() {

    const body = {
        username: username.value,
        password: password.value
    }

    const res = await fetch('/api/auth/login', {
        method: "POST",
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body),
        credentials: 'include'
    });

    const data = await res.json();

    if (data.message == "Logged in successfully") {

        localStorage.setItem("jwt", data.jwt); // set jwt to local storage (CHANGE METHOD)

        console.log("Logged in successfully")

        authenticated.value = true;

        // Emit value true for authenticated
        emit('authenticated', true);

        connectSocket(); //connect socket after login

        // Emit object doUpdate, makes the threadMenu update it's selection
        emit("updateThreadsAvailable", {doUpdate: true});
    }

}

// Handles registration
async function handleRegister() {

    const body = {
        username: register_username.value,
        password: register_password.value,
        password_confirm: register_password_confirm.value
    }

    console.log("Register body \n", body);

    const res = await fetch('/api/user/register', {
        method: "POST",
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.message == "Registered successfully") {

        console.log("Registered in successfully");

    }

}





</script>

<template>
    <!-- If not authenticated display login / register form -->
    <template v-if="!authenticated">
        <section id="login-register">
            <form id="login-form" @submit.prevent="handleLogin">
                <label for="username">Username</label>
                <input type="text" placeholder="username" v-model="username">
                <label for="password">Password</label>
                <input type="password" placeholder="******" v-model="password">
                <button type="submit">Sign in</button>
            </form>
            <!-- Check if isRegisterable, if it is then render -->
            <form v-if="isRegisterable" id="register-form" @submit.prevent="handleRegister">
                <label for="username">Username</label>
                <input type="text" placeholder="username" v-model="register_username">
                <label for="password">Password</label>
                <input type="password" placeholder="******" v-model="register_password">
                <label for="password">Password Confirmation</label>
                <input type="password" placeholder="******" v-model="register_password_confirm">

                <button type="submit">Sign in</button>
            </form>
        </section>
    </template>
    <template v-else>

    </template>

</template>


<style scoped>
#login-form {
}
#login-register {

    width: 500px;
    height: 150px;
    left: calc(50vw - 300px + 50px );

    top: 50vh;
    position: absolute;
    z-index: +100;
    background-color: #555;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: start;

    padding: 50px;
    gap: 5px;
}
</style>

```

---

### ThreadMenu.vue [*Link*](./src/components/ThreadsMenu.vue)

ThreadMenu handles the threads available to the user, and renders them. It also adds the delete function. To understand what the code does read the comments. This may change.

```vue
<script setup lang="ts">


import { ref, onMounted, nextTick } from 'vue'

import type thread from '../../../types/thread';

const props = defineProps<{threadsAvailable: thread[]}>()

const emit = defineEmits(['openThread', 'updateThreadsAvailable']);

console.log(props.threadsAvailable);


function handleOpenThread(i: number) {
    console.log("Thread opening");

    const thread = props.threadsAvailable[i];

    if (!thread) {
        console.warn("No thread found at index ", i);
        return;
    }

    const title = thread.title; // title of selected thread
    const idThread = thread.idThread; // to reference the thread to find
    // console.log(title);

    emit('openThread', thread);
}

async function handleCreateThread () {
    console.log("Creating thread");
    const res = await fetch('/api/ai/thread/create');
    console.log(res);
    emit('updateThreadsAvailable');
}

let editMode = ref(false);

function handleEditMode() {
    console.log("Starting edit mode on threads, running:", self);


    console.log("editMode is", editMode);

    // display delete checkboxes and delete button
    editMode.value = !editMode.value;

}


// reference all inputs
const checkedIds = ref([]);

console.log("Reference:", checkedIds);


// Goes through each selected thread and deletes them
async function handleDeleteThreads() {
    console.log("Trying to delete threads:", checkedIds.value.map((thread) => {
        return thread;
    }));

    console.log(checkedIds.value.map(e=>e));

    const body = {
        threads: checkedIds.value.map(e=>e)
    }

    console.log(body);

    // confirm user choice
    if (confirm("Are you sure you want to delete the selected threads? This is irreversable! Click OK to delete or No to Cancel.")) {
        console.log("Threads are now deleted");

        const res = await fetch('/api/ai/thread/deleteSelected', {
            method: "POST",
            headers: {
                'Content-Type':'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log("Result of handleDeleteThreads: ", res);

    }

    // update threads
    emit("updateThreadsAvailable");

}

</script>

<template>
    <ul id="thread-menu">
        <!-- If editmode is not active -->
        <template v-if="!editMode">
            <button @click="handleEditMode">...</button>

            <!-- For each thread make button to open thread -->
            <li class="menu-child" v-for="(thr, index) in props.threadsAvailable" :key="index" >
                <button @click="handleOpenThread(index) /* handles thread opening */ ">{{thr.title}}</button>
            </li>
        </template>

        <!-- If editmode is active -->
        <template v-else>

            <div class="flex-row">
                <button @click="handleEditMode">...</button>
                <button class="delete-button" @click="handleDeleteThreads">Delete</button>
            </div>
            <!-- For each thread make button to open thread aswell as the delete checkbox -->
            <li class="menu-child" v-for="(thr, index) in props.threadsAvailable" :key="index" >
                <button
                @click="handleOpenThread(index) /* handles thread opening */ ">{{thr.title}}</button>
                <input type="checkbox"
                v-model="checkedIds"
                :value="thr.idThread"
                :key="index">
            </li>
        </template>
        <button @click="handleCreateThread">Create thread</button>
    </ul>
</template>


<style lang="scss" scoped>
#thread-menu {
    width: 12.5%;

    height: 100%;
    margin:0;

    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: center;
    gap: 1rem;

    offset: 0;

    padding: 0;

    overflow: scroll;

    button {
        width: 100%;
        box-sizing: border-box;
    }

    .flex-row {

        width: 100%;

        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: start;

    }

    .menu-child {
        width: 100%;
        height: fit-content;

        display: flex;
        flex-direction: row;

        justify-content: space-around;
        align-items: center;
        padding: 0;
        margin: 0;

        input {
            margin: 0;
            width: 20%;
        }
    }

    .move {

        width: 100%;
        margin: 0;

        box-sizing: border-box;

        transition: width 1s;

    }

    .shrink {
        width: 80%;
    }

}
</style>
```

---

### OpenThread.vue [*Link*](./src/components/OpenThread.vue)

OpenThread handles the currently selected thread, it allows for prompting the ai, it uses `useSocket.js` to handle the socket functionality, and it allows the user to change the title of the thread to their preference. Below is a code snippet, as always this may change, to understand the code read the comments.

```vue
<script setup lang="ts">

import {ref, onMounted, computed, watch} from 'vue';

import MarkdownIt from 'markdown-it';

import { sendPrompt, aiChunks, socket } from '../composables/useSocket';


const md = new MarkdownIt();

const props = defineProps<{title: string, index: number, idThread: number}>();

// console.log(props);

const messages = ref<any[]>([]);


const emit = defineEmits(['updateThreadTitle']);

onMounted(async () => {


});

const thread = props.idThread;

// console.log(thread)

async function getAllMessages() {

  const res = await fetch(`/api/ai/thread/id/${thread}/messages`);
  const data = await res.json();

  console.log(data);

  messages.value = data;

}

// get all messages on load
getAllMessages();

const prompt = ref(null);
const isLoading = ref(false);

// sends a prompt and awaits the response
async function handlePromptFallback() {
  isLoading.value = true;
  const body = {
    model: "llama3",
    message: {
      role: "user",
      content: prompt.value
    },
    thread: props.idThread
  }
  const res = await fetch('/api/ai/chat', {
    method: "POST",
    headers: {
        'Content-Type':'application/json'
    },
    body: JSON.stringify(body)
  })

  getAllMessages();

  console.log(await res);

  isLoading.value = false;

}

// joins the chunks currently done.
const currentMessage = computed(()=>aiChunks.value.join(''));

// handles the users prompt and refreshes messages in the open thread
function handlePrompt() {

  // scroll to bottom
  scrollToBottom();


  isLoading.value=true; // set loading to true

  // structure message with the prompts value
  const message = {"role": "user", "content": prompt.value}

  prompt.value = null;

  // if the socket is connected alert the user and set loading to false
  if (!socket) {
    alert("Socket not connected.");
    isLoading.value = false;
    return;
  }

  getAllMessages().then(() => {
    // scroll to bottom
    scrollToBottom()

  }); //get all messages after prompt is done processing

  sendPrompt(props.idThread, message, "llama3"); // model: llama3 llama3.2 smollm2:135m dolphin-phi

  // log chunks
  console.log(aiChunks);


  // set isLoading to false
  isLoading.value=false;
}



// define referene for the title
const threadTitle = ref(props.title);

// changes title of thread
async function handleThreadChange() {

  // emit values idThread, title
  emit('updateThreadTitle', {idThread: props.idThread, title: threadTitle.value});

  // debug
  console.log("Title of thread changed to", threadTitle.value);

  // the body to alter selected thread's title
  const body = {
    thread: props.idThread,
    title: threadTitle.value
  }

  // the request made to the api
  const res = await fetch("/api/ai/thread/alter", {
    method:"POST",
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });

  // debug
  // console.log(res);

}


// scroll to bottom of thread
const threadList = ref<HTMLElement | null>(null);
function scrollToBottom() {
  if (threadList.value) {
    threadList.value.scrollTop = threadList.value.scrollHeight;
  }
}


// watch messages vs currentMessage for changes and scroll
watch([messages, currentMessage], () => {
  scrollToBottom();
});

</script>

<template>
  <main id="thread-main">
    <!-- The title of the thread -->
    <div id="title-area">
      <input type="text" v-model="threadTitle" @change="handleThreadChange" :style="{width: (title.length || 10) + 'ch'}">
    </div>

    <!-- List of messages -->
    <ul id="thread" ref="threadList">
      <!-- Prints all previous messages -->
      <li
        class="message"
        :class="{'message-user': message.role === 'user'} /* If role = user add class message-user */ "
        v-for="(message, index) in messages /* For loop to render each message */"
        :key="index"
        v-html="md.render(message.content ?? '') /* render the message's content in markdown */ "
      ></li>
      <!-- Prints the latest message -->
      <li v-if="currentMessage" class="message" v-html="md.render(currentMessage)">
      </li>
    </ul>

    <!-- Prompt elements -->
    <form id="prompt" @submit.prevent="handlePrompt">
      <textarea type="text" name="send-message" v-model="prompt"></textarea>
      <button type="submit" :disabled="isLoading">Send</button>
    </form>
  </main>
</template>

<style lang="scss">

#title-area {
  height: 10%;
  width: 100%;

}

#thread-main {
  display: flex;
  flex-direction: column;

  width: 82.5%;
  height: 100%;

}

#thread {
  width: 100%;
  height: 70%;

  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;

  overflow: scroll;

  margin: 1rem;

  box-sizing: border-box;

}

#prompt {
  width: 100%;
  height: 20%;

  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  gap: 1rem;

  box-sizing: border-box;


}
.message {
  width: fit-content;
  max-width: 70%;
  list-style-type: none;
  offset: 0;

}
.message-user {
  width: fit-content;
  max-width: 70%;
  align-self: flex-end;
}
</style>
```

---
