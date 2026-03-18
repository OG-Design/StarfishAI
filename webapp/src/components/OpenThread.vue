<script setup lang="ts">

import {ref, onMounted, computed, watch, nextTick} from 'vue';

import MarkdownIt from 'markdown-it';

import { sendPrompt, aiChunks, socket } from '../composables/useSocket';

import CustomSelect from './CustomSelect.vue';
import { type CustomSelectType } from '../types/CustomSelectType';
const md = new MarkdownIt();

const props = defineProps<{title: string, index: number, idThread: number, models: any[]}>();

import type { ModelOption } from '../types/ModelOption';
import { apiFetch } from '../composables/useApi';


const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
const assetBase = isElectron ? './animation/' : '/animation';


// define referene for the title
const threadTitle = ref(props.title);
const models = ref<ModelOption[]>(props.models as ModelOption[]);

const modelsReType = ref<CustomSelectType[]>(
  models.value.map(model => ({
    key: model.modelName,
    value: model.modelFullName
  }))
);

const currentModelReType = computed<CustomSelectType>(() => ({
  key: currentModel.value?.modelName ?? '',
  value: currentModel.value?.modelFullName ?? ''
}));

const currentModel = ref<ModelOption | null>(models.value[0] ?? null);
const stored = localStorage.getItem("selectedModel");
currentModel.value = stored ? JSON.parse(stored) as ModelOption : null;

const messages = ref<any[]>([]);
const personality = ref<string>('');
const isLoading = ref(false);

const emit = defineEmits(['updateThreadTitle']);


const promptAnimationPoster = assetBase + '/ArrowToStop-poster.png';
const promptAnimationForward = assetBase + '/ArrowToStop.apng';
const promptAnimationReverse = assetBase + '/StopToArrow.apng';
const promptAnimationSrc = ref(promptAnimationPoster);



function playPromptAnimation(src: string) {
  promptAnimationSrc.value=promptAnimationForward;
  nextTick(() => {
    promptAnimationSrc.value = `${src}?v=${Date.now()}`;
  });
}

watch(isLoading, (loading, prev) => {
  if (loading) {
    playPromptAnimation(promptAnimationForward); 
  } else if (prev) {
    playPromptAnimation(promptAnimationReverse);
  }
}, {immediate: false});


/*
  reset aiChunks value so each time OpenThread is opened it gives a clear value,
  e.g while having a finished prompt in one thread and switching to another it-
  -won't flow over to the other thread.
*/
aiChunks.value=[];

onMounted(async () => {


  // get all messages on load
  await getAllMessages();

  nextTick().then(()=>{
    scrollToBottom();
  })

});

const thread = props.idThread;

// console.log(thread)

async function getAllMessages() {

  const res = await apiFetch(`/api/ai/thread/id/${thread}/messages`, {
    credentials: 'include'
  });
  const data = await res.json();

  console.log(data);

  messages.value = data;

  const systemMessage = data.find((msg: any) => {
    return msg.role==='system'
  });

  if (systemMessage) {
    personality.value=systemMessage.content;
    console.log("personality.value:",personality.value)
  }

}


const prompt = ref(null);


// sends a prompt and awaits the response
// async function handlePromptFallback() {
//   isLoading.value = true;
//   const body = {
//     model: "llama3",
//     message: {
//       role: "user",
//       content: prompt.value
//     },
//     thread: props.idThread
//   }
//   const res = await fetch('/api/ai/chat', {
//     method: "POST",
//     headers: {
//         'Content-Type':'application/json'
//     },
//     body: JSON.stringify(body)
//   })

//   getAllMessages();

//   console.log(await res);

//   isLoading.value = false;

// }

// joins the chunks currently done.
const currentMessage = computed(()=>aiChunks.value.join(''));

// handles the users prompt and refreshes messages in the open thread
function handlePrompt() {

  if (!currentModel.value) return console.log("No model selected"); // check if current model exists

  // Structure the user message
  const message = { role: "user", content: prompt.value };

  // Add the prompt message to the messages array immediately
  messages.value.push(message);

  // Clear the input field
  prompt.value = null;

  // Scroll to the bottom of the thread
  scrollToBottom();

  // Set loading state to true
  isLoading.value = true;

  // Send the prompt via WebSocket
  sendPrompt(props.idThread, message, currentModel.value.modelFullName); // model: llama3 llama3.2 smollm2:135m dolphin-phi

  console.log("Selected model:", currentModel.value);

  // Debug log to verify messages
  console.log("Messages after sending prompt:", messages.value);

  // Create a placeholder for the assistant's message
  let assistantMessage = { role: 'assistant', content: '', complete: false };
  messages.value.push(assistantMessage);

  // Handle WebSocket events
  const handleChunk = (chunk: any) => {
    // Append the chunk to the assistant's message content
    assistantMessage.content += chunk;

    // Trigger Vue reactivity for the messages array
    messages.value = [...messages.value];

    // Scroll to the bottom of the thread
    scrollToBottom();
  };

  const handleComplete = () => {
    // Mark the assistant message as complete
    assistantMessage.complete = true;

    // Set loading state to false
    isLoading.value = false;

    // Clean up listeners
    socket?.off('ai_chunk', handleChunk);
    socket?.off('ai_complete', handleComplete);
  };

  // Set up WebSocket listeners
  socket?.on('ai_chunk', handleChunk);
  socket?.once('ai_complete', handleComplete);

  socket?.once('error', (err) => {
    console.error("Socket error:", err);
    isLoading.value = false;
    alert("Error occurred while processing your request.\n Error: " + err.message);

    // Clean up listeners
    socket?.off('ai_chunk', handleChunk);
    socket?.off('ai_complete', handleComplete);
  });

  socket?.once('connect_error', (err) => {
    console.error("Connection error:", err);
    isLoading.value = false;
    alert("Connection error occurred");

    // Clean up listeners
    socket?.off('ai_chunk', handleChunk);
    socket?.off('ai_complete', handleComplete);
  });
}

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
  // const res =
  await apiFetch("/api/ai/thread/alter", {
    method:"POST",
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });

  // debug
  // console.log(res);

}


// sends the personality e.g the system prompt to the API
async function handlePersonalityChange() {
  const body = {
    thread: thread,
    personality: personality.value
  }

  // const res =
  await apiFetch("/api/ai/thread/alter/personality", {
    method: 'POST',
    headers: {
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
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


console.log(props.models)
console.log("Models: \n", models);

// store the selected model in localStorage to keep for reload and other threads.
function handleUpdateSelectedModel(selected: CustomSelectType) {
  const found = models.value.find(m => m.modelFullName === selected.value);
  if (found) {
    currentModel.value = found;
    localStorage.setItem("selectedModel", JSON.stringify(found));
    console.log(localStorage.getItem("selectedModel"));
  }
}

</script>

<template>
  <main id="thread-main">
    <!-- The title of the thread -->
    <div id="top-menu">
      <input type="text" v-model="threadTitle" @change="handleThreadChange" :style="{width: (title.length || 10) + 'ch'}">
    </div>

    <!-- List of messages -->
    <ul id="thread" ref="threadList">
      <!-- This is the system prompt, handles the personality of the AI -->
      <template v-for="(message) in messages">
      <!-- System prompt -->
      <div v-if="message.role === 'system'">
        <label for="system-prompt">Personality</label>
        <textarea
        id="system-prompt"
        @change="handlePersonalityChange"
        v-model="personality"
        >{{ message.content }}</textarea>
      </div>
      </template>

      <!-- Prints all previous messages -->
      <li
        class="message markdown-content"
        :class="{'message-user': message.role === 'user'} /* If role = user add class message-user */ "
        :style="{display: message.role === 'system' ? 'none' : 'block' /* Hide system messages */}"
        v-for="(message, index) in messages /* For loop to render each message */"
        :key="index"
        v-html="md.render(message.content ?? '') /* render the message's content in markdown */ "
      ></li>

      <!-- removed to prevent duplicating latest message after changes, remove completely after testing! -->
      <!-- Prints the latest message -->
      <!--<li v-if="currentMessage" class="message markdown-content" v-html="md.render(currentMessage)">
      </li>-->

    </ul>
    <div v-if="isLoading" class="loading-gif-container"><img class="loading-gif" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
    <div v-else class="loading-gif-container"></div>

    <div id="model-selector">
    <CustomSelect :values="modelsReType" :currentSelection="currentModelReType" :updateHandler="handleUpdateSelectedModel" />
    </div>
    <!-- <div id="model-selector">
      <select name="" id="models" v-model="currentModel" @click="handleUpdateSelectedModel">
        <option v-for="(model, index) in models" :key="index" :value="model">{{model.modelName}}</option>
      </select>
    </div> -->
    <!-- Prompt elements -->
    <form id="prompt" @submit.prevent="handlePrompt">
      <textarea type="text" name="send-message" v-model="prompt"></textarea>
      <div>
        <button type="submit" :disabled="isLoading"><img class="prompt-image" :src="promptAnimationSrc" alt=""></button>
      </div>
    </form>
  </main>
</template>

<style lang="scss" >

$shadow: 0px 0px 16px 0px rgba(0,0,0,.5);

$border-radius: 1rem;


#system-prompt {
  width: calc(100% - var(--space) * 2);
  height: auto;
  min-height: 50px;

  background-color: #1E2230;

  border: solid 1px #1E2230;
  border-radius: $border-radius;

  margin: var(--space);
  margin-bottom: 0;

  padding: var(--space);

  box-sizing: border-box;

  resize: none;

  // font-style: italic;
  color: #888b94;

  transition: .2s;

  &:hover {
    border: 1px solid $key-1;
  }
}

#top-menu {
  height: fit-content;
  width: fit-content;
  position: absolute;
  z-index: 10;
  margin-left: var(--space);
  top: calc(var(--space) * 2);
  padding: var(--space);
  box-sizing: border-box;


  input {
    height: 100%;
    min-width: 0;

    font-size: 24px;

    padding-left: var(--space);

    background-color: transparent;
    border: solid 1px hsla(237, 100%, 70%, .2);
    border-radius: $border-radius;

    background-color: hsla(237, 100%, 70%, .05);

    backdrop-filter: blur(8px);

    transition: .2s;

    &:hover {
      border-color: hsla(237, 100%, 70%, 1);
    }

  }

}

#thread-main {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;

  margin: 0;
  padding: 0;
  grid-area: thread;

  background-color: #12141A;
}

#thread {
  height: calc(100% - var(--space) * 2);
  width: calc(100% - var(--space) * 2);

  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;

  overflow-y: scroll;

  margin: var(--space);
  margin-bottom: 0;
  margin-top: 0;
  padding-top: calc(var(--space) * 5);
  padding-bottom: calc(var(--space) * 10);
  gap: calc(var(--space) * 5);

  box-sizing: border-box;

}

#prompt {
  width: calc(100% - var(--space) );
  height: 20%;
  background-color: $bg-2;

  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  gap: var(--space);
  margin: 0;
  margin-left: calc(var(--space) / 2);
  // margin-right: calc(var(--space) / 2);
  margin-bottom: var(--space);

  padding-left: var(--space);
  padding-right: var(--space);

  border-radius: $border-radius;

  box-sizing: border-box;

  // shadow
  box-shadow: $shadow;

  textarea {
    min-width: 0;
    width: 80%;
    height: calc(100% - var(--space) * 2);

    resize: none;

    background-color: $bg-ac-1;
    color: $text-1;

    border: solid 1px #1E2230;
    border-radius: $border-radius;

    &:active, &:focus {
      border: solid 1px $key-2;
    }

    transition: .2s;

    &:hover {
      border: 1px solid $key-2;
    }

  }


  $btn-size: 50px;
  $btn-size-increased: calc($btn-size * 1.2);
  div {
    width: calc($btn-size-increased + var(--space));
    display: flex;
    justify-content: center;
    align-items: center;
  }

  button {


    width: $btn-size;
    height: $btn-size;

    border: none;
    border-radius: $border-radius * 10000;

    // background-color: hsla(240, 100%, 74%, 12%);
    background: transparent;
    color: white;
    font-weight: 600;

    &:hover {


      width: $btn-size-increased;
      height: $btn-size-increased;

      // background-color: hsla(240, 100%, 74%, 50%);
      cursor: pointer;
    }

    &:focus {
      width: calc($btn-size * 1.01);
      height: calc($btn-size * 1.01);


      background-color: hsla(240, 100%, 74%, 50%);
    }

    &:disabled {
      // background-color: #44475a;
      opacity: .5;
      cursor: not-allowed;
    }
  }

  .prompt-image {
    width: 100%;
    height: auto;
  }


}
.message {
  min-width: 0;
  max-width: 70%;
  list-style-type: none;
  offset: 0;

  box-sizing: border-box;

  padding: var(--space);

  border-radius: $border-radius;
  border: 1px solid $bg-2;

  background-color: $bg-2;

  transition: .2s;


}

.message:hover {
  border: 1px solid $key-1;
}

.message-user {

  min-width: 0;
  max-width: 70%;
  align-self: flex-end;
  justify-items: end;
}
.message-user:hover {
  border: 1px solid $key-2;
}

#model-selector {
  position: absolute;
  width: 150px;
  bottom: 20%;
  padding-left: calc(var(--space) * 2);

  
}

.loading-gif-container {
  width: 150px;
  height: 150px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 5rem;
  position: absolute;

  bottom: 10rem;
  left: min(20rem, calc(50% - 75px));
}

.loading-gif {
  width: 150px;
  height: auto;
  background: transparent;
  display: block;



}

// Markdown styling
.markdown-content {
  color: #e8f4f8;
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    color: #6ec9f0;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }

  strong, b {
    font-weight: 700;
    color: #8ed4f5;
  }

  em, i {
    font-style: italic;
    color: #b8e3f7;
  }

  code {
    background-color: #1a2b3a;
    color: #9bc4db;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;

    overflow: scroll;

  }

  pre {
    background-color: #0f1e2b;
    border: 1px solid #2a4a5e;
    border-radius: 6px;
    padding: 1rem;
    overflow-x: scroll;
    width: calc(100% - var(--space) * 2);
    margin: 1rem 0;

    code {
      background-color: transparent;
      padding: 0;
      color: #a8c8dc;
    }
  }

  a {
    color: #4fb3e8;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: #6ec9f0;
      text-decoration: underline;
    }
  }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 2rem;
    color: #d4ebf5;

    li {
      margin: 0.25rem 0;
      color: #c5e0f0;

      &::marker {
        color: #6ec9f0;
      }
    }

    ul, ol {
      margin: 0.25rem 0;

      li::marker {
        color: #5ab8e3;
      }
    }
  }

  blockquote {
    border-left: 4px solid #4fb3e8;
    padding-left: 1rem;
    margin: 1rem 0;
    color: #b8e3f7;
    font-style: italic;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    background-color: #1a3447;
    border-radius: 6px;
    overflow: hidden;

    thead {
      background-color: #2d5a7b;

      th {
        color: #6ec9f0;
        font-weight: 700;
        padding: 0.75rem;
        text-align: left;
        border-bottom: 2px solid #4fb3e8;
        word-break: break-all;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid #2d5a7b;

        word-break: break-all;

        &:hover {
          background-color: #223d52;
        }

        &:last-child {
          border-bottom: none;
        }
      }

      td {
        padding: 0.75rem;
        color: #d4ebf5;
      }
    }
  }

  hr {
    border: none;
    border-top: 2px solid #2d5a7b;
    margin: 1.5rem 0;
  }

  p {
    margin: 0.5rem 0;
  }
}

@media screen and (max-width:500px) {

  #thread-main {
    min-width: 0;
    width: 100%;
  }

  #top-menu {
    max-width: calc(100% - var(--space) * 4);
    overflow: hidden;
    input {
      max-width: calc(40vw - var(--space) * 4);
      min-width: 0;
    }
  }

}

</style>

