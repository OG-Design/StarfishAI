<script setup lang="ts">

import {ref, onMounted, computed, watch, nextTick} from 'vue';

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
// Light theme override for highlight.js
import '../styles/atom-one-light.css';

import { sendPrompt, aiChunks, socket, connectSocket } from '../composables/useSocket';

import CustomSelect from './CustomSelect.vue';
import { type CustomSelectType } from '../types/CustomSelectType';
const md: any = new MarkdownIt({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  }
});

const props = defineProps<{title: string, index: number, idThread: number, models: any[]}>();

import type { ModelOption } from '../types/ModelOption';
import { apiFetch } from '../composables/useApi';


const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
const assetBase = isElectron ? './animation/' : '/animation';


// define referene for the title
const threadTitle = ref(props.title);
const models = ref<ModelOption[]>(props.models as ModelOption[]);

// Composite key: idGroup + modelFullName + thinkingLevel so models with the same
// modelFullName but different thinking settings are always distinct.
const modelKey = (m: ModelOption) => `${(m as any).idGroup}_${m.modelFullName}_${(m as any).thinking ?? ''}`;

// Display label — append a thinking indicator when the model has thinking enabled.
function modelDisplayName(m: ModelOption): string {
  const thinking = (m as any).thinking;
  if (!thinking || thinking === 'false' || thinking === false) return m.modelName;
  const label = thinking === 'true' || thinking === true ? 'Thinking' : `Thinking (${thinking})`;
  return `${m.modelName} [${label}]`;
}

const modelsReType = ref<CustomSelectType[]>(
  models.value.map(model => ({
    key: modelDisplayName(model),
    value: modelKey(model)
  }))
);

const currentModelReType = computed<CustomSelectType>(() => ({
  key: currentModel.value ? modelDisplayName(currentModel.value) : '',
  value: currentModel.value ? modelKey(currentModel.value) : ''
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

  // Find the last thinking message so it starts open by default
  let lastThinkingIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].role === 'thinking') { lastThinkingIdx = i; break; }
  }
  messages.value = data.map((m: any, i: number) =>
    m.role === 'thinking' ? { ...m, _open: i === lastThinkingIdx } : m
  );

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
async function handlePrompt() {

  try {
    const res = await handleFileUpload();
    console.log(res);
    APIFilePaths.value = res;
    const res1 = await fetchMessageImages();
    images.value = res1; // += ?
  } catch (err) {
    console.error('File upload failed:', err);
  }


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

  console.log("Selected model:", currentModel.value);

  // Debug log to verify messages
  console.log("Messages after sending prompt:", messages.value);

  // Create a placeholder for the thinking content (inserted into the list only when the first chunk arrives)
  let thinkingMessage: any = null;

  // Create a placeholder for the assistant's message
  let assistantMessage = { role: 'assistant', content: '', complete: false };
  messages.value.push(assistantMessage);

  const cleanupListeners = () => {
    socket?.off('ai_chunk', handleChunk);
    socket?.off('ai_thinking_chunk', handleThinkingChunk);
    socket?.off('ai_thinking_complete', handleThinkingComplete);
    socket?.off('ai_complete', handleComplete);
    socket?.off('error', handleError);
    socket?.off('connect_error', handleConnectError);
  };

  // Handle thinking stream chunks — insert a thinking placeholder before the assistant message on first chunk
  const handleThinkingChunk = (chunk: string) => {
    if (!thinkingMessage) {
      thinkingMessage = { role: 'thinking', content: '', complete: false, _open: true };
      const assistantIdx = messages.value.indexOf(assistantMessage);
      messages.value.splice(assistantIdx, 0, thinkingMessage);
    }
    thinkingMessage.content += chunk;
    messages.value = [...messages.value];
    scrollToBottom();
  };

  const handleThinkingComplete = () => {
    if (thinkingMessage) {
      thinkingMessage.complete = true;
      messages.value = [...messages.value];
    }
  };

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
    cleanupListeners();
  };

  const handleError = (err: any) => {
    console.error("Socket error:", err);
    isLoading.value = false;
    cleanupListeners();
    alert("Error occurred while processing your request.\n Error: " + (err?.message ?? "Unknown error"));
  };

  const handleConnectError = (err: any) => {
    console.error("Connection error:", err);
    isLoading.value = false;
    cleanupListeners();
    alert("Connection error occurred");
  };

  try {
    await connectSocket();
    if (!socket) {
      throw new Error('Socket not connected');
    }

    // Set up WebSocket listeners before emitting prompt to avoid missing fast error responses.
    socket.on('ai_chunk', handleChunk);
    socket.on('ai_thinking_chunk', handleThinkingChunk);
    socket.once('ai_thinking_complete', handleThinkingComplete);
    socket.once('ai_complete', handleComplete);
    socket.once('error', handleError);
    socket.once('connect_error', handleConnectError);

    console.log("currentModel:", currentModel.value);

    // Send the prompt via WebSocket
    const idGroup = Number((currentModel.value as any).idGroup ?? (currentModel.value as any).idUserGroup);
    if (!idGroup) {
      throw new Error('Model group id is missing. Re-select the model in Settings.');
    }
    await sendPrompt(props.idThread, message, { modelFullName: currentModel.value.modelFullName, thinkingLevel: (currentModel.value as any).thinking }, idGroup);
  } catch (err: any) {
    console.error('Failed to send prompt:', err);
    isLoading.value = false;
    cleanupListeners();
    alert("Error occurred while processing your request.\n Error: " + (err?.message ?? "Unknown error"));
  }
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

const refFiles = ref<File[]>([]);
const APIFilePaths = ref<string[]>();

function onFileChange(event: Event) {
  const target = event?.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    refFiles.value = Array.from(target.files);
  }

  console.log("onFileChange files:", refFiles.value);
}

async function handleFileUpload() {

  if (refFiles.value.length === 0) {
    return;
  }

  const formData = new FormData();

  refFiles.value.forEach(file => {
    formData.append('files', file);
  })

  const res = await apiFetch('/api/filestorage/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  console.log('File upload result:', data);

  return data.filesIndex;
}

const images = ref();
async function fetchMessageImages() {
  
  const body = {
    filePaths: APIFilePaths.value
  };

  const res = await apiFetch('/api/filestorage/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream'
    }, 
    body: JSON.stringify(body)
  });  

  const data = await res.json();

  console.log('res from fetchMessageImages:', data)
  
  return data;

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

// Toggle a thinking block open/closed
function toggleThinking(message: any) {
  message._open = !message._open;
}

// store the selected model in localStorage to keep for reload and other threads.
function handleUpdateSelectedModel(selected: CustomSelectType) {
  const found = models.value.find(m => modelKey(m) === selected.value);
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
      <template v-for="(message, index) in messages" :key="index">

        <!-- Thinking block: collapsible, open while streaming or if it is the latest thinking message -->
        <li v-if="message.role === 'thinking'" class="thinking-block">
          <div class="thinking-details" :class="{ open: message._open }">
            <div class="thinking-summary" role="button" @click="toggleThinking(message)">
              <span>Thinking</span>
              <span v-if="message.complete === false" class="thinking-indicator">...</span>
            </div>
            <div class="thinking-content-wrapper">
              <div class="thinking-content markdown-content" v-html="md.render(message.content ?? '')"></div>
            </div>
          </div>
        </li>

        <!-- System message (hidden) -->
        <li v-else-if="message.role === 'system'" style="display:none"></li>

        <!-- User / assistant messages -->
        <li
          v-else
          class="message markdown-content"
          :class="{'message-user': message.role === 'user'}"
          v-html="md.render(message.content ?? '')"
        ></li>

      </template>

      <!-- removed to prevent duplicating latest message after changes, remove completely after testing! -->
      <!-- Prints the latest message -->
      <!--<li v-if="currentMessage" class="message markdown-content" v-html="md.render(currentMessage)">
      </li>-->

    </ul>
    <div v-if="isLoading" class="loading-gif-container"><img class="loading-gif" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
    <div v-else class="loading-gif-container"></div>

    <div id="model-selector">
    <CustomSelect :values="modelsReType" :currentSelection="currentModelReType" :updateHandler="handleUpdateSelectedModel" direction="up"/>
    </div>
    <!-- <div id="model-selector">
      <select name="" id="models" v-model="currentModel" @click="handleUpdateSelectedModel">
        <option v-for="(model, index) in models" :key="index" :value="model">{{model.modelName}}</option>
      </select>
    </div> -->
    <!-- Prompt elements -->
    <form id="prompt" @submit.prevent="handlePrompt">
      <textarea type="text" name="send-message" v-model="prompt"></textarea>
      <input type="file" multiple="true" v-on:change="onFileChange">
      <div>
        <button type="submit" :disabled="isLoading"><img class="prompt-image" :src="promptAnimationSrc" alt=""></button>
      </div>
    </form>
  </main>
</template>

<style lang="scss" >

// Light theme override for highlight.js codeblocks
@media (prefers-color-scheme: light) {
  .hljs {
    color: #383a42 !important;
    background: #fafafa !important;
  }
  .hljs-comment,
  .hljs-quote {
    color: #a0a1a7 !important;
    font-style: italic;
  }
  .hljs-doctag,
  .hljs-keyword,
  .hljs-formula {
    color: #a626a4 !important;
  }
  .hljs-section,
  .hljs-name,
  .hljs-selector-tag,
  .hljs-deletion,
  .hljs-subst {
    color: #e45649 !important;
  }
  .hljs-literal {
    color: #0184bb !important;
  }
  .hljs-string,
  .hljs-regexp,
  .hljs-addition,
  .hljs-attribute,
  .hljs-meta .hljs-string {
    color: #50a14f !important;
  }
  .hljs-attr,
  .hljs-variable,
  .hljs-template-variable,
  .hljs-type,
  .hljs-selector-class,
  .hljs-selector-attr,
  .hljs-selector-pseudo,
  .hljs-number {
    color: #986801 !important;
  }
  .hljs-symbol,
  .hljs-bullet,
  .hljs-link,
  .hljs-meta,
  .hljs-selector-id,
  .hljs-title {
    color: #4078f2 !important;
  }
  .hljs-built_in,
  .hljs-title.class_,
  .hljs-class .hljs-title {
    color: #c18401 !important;
  }
  .hljs-emphasis {
    font-style: italic;
  }
  .hljs-strong {
    font-weight: bold;
  }
  .hljs-link {
    text-decoration: underline;
  }
}


#system-prompt {
  width: calc(100% - var(--space) * 2);
  height: auto;
  min-height: 50px;

  background-color: var(--bg-ac-1);

  border: solid 1px var(--bg-ac-1);
  border-radius: var(--border-radius);

  margin: var(--space);
  margin-bottom: 0;

  padding: var(--space);

  box-sizing: border-box;

  resize: none;

  // font-style: italic;
  color: var(--text-muted);

  transition: .2s;

  &:hover {
    border: 1px solid var(--key-1);
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
    border: solid 1px var(--border-1);
    border-radius: var(--border-radius);

    background-color: var(--bg-alpha-2);

    backdrop-filter: blur(8px);

    transition: .2s;

    &:hover {
      border-color: var(--key-2-solid);
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

  background-color: var(--bg-1);
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
  background-color: var(--bg-2);

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

  border-radius: var(--border-radius);

  box-sizing: border-box;

  // shadow
  box-shadow: var(--shadow);

  textarea {
    min-width: 0;
    width: 80%;
    height: calc(100% - var(--space) * 2);

    resize: none;

    background-color: var(--bg-ac-1);
    color: var(--text-1);

    border: solid 1px var(--bg-ac-1);
    border-radius: var(--border-radius);

    &:active, &:focus {
      border: solid 1px var(--key-2);
    }

    transition: .2s;

    &:hover {
      border: 1px solid var(--key-2);
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
    border-radius: 9999px;

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


      background-color: var(--key-2-alpha);
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

  border-radius: var(--border-radius);
  border: 1px solid var(--bg-2);

  background-color: var(--bg-2);

  transition: .2s;


}

.message:hover {
  border: 1px solid var(--key-1);
}

.message-user {

  min-width: 0;
  max-width: 70%;
  align-self: flex-end;
  justify-items: end;
}
.message-user:hover {
  border: 1px solid var(--key-2);
}

.thinking-block {
  min-width: 0;
  max-width: 70%;
  list-style-type: none;
  align-self: flex-start;



  .thinking-details {
    background-color: var(--thinking-bg);
    border: 1px solid var(--thinking-border);
    border-radius: var(--border-radius);
    overflow: hidden;
    transition: border-color .2s;

    &.open {
      border-color: var(--thinking-border-open);
    }

    &:hover {
      border-color: var(--thinking-border-hover);
    }
  }

  .thinking-summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: calc(var(--space) * 0.75) var(--space);
    cursor: pointer;
    user-select: none;
    font-size: 0.85em;
    font-style: italic;
    color: var(--thinking-text);
    list-style: none;

    &::-webkit-details-marker { display: none; }

    &::before {
      content: '▶';
      font-size: 0.7em;
      transition: transform .2s;
      display: inline-block;
    }
  }

  .thinking-details.open > .thinking-summary::before {
    transform: rotate(90deg);
  }

  .thinking-indicator {
    animation: thinking-dots 1.2s infinite;
    letter-spacing: 0.1em;
  }

  .thinking-content-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.35s ease;
  }

  .thinking-details.open > .thinking-content-wrapper {
    grid-template-rows: 1fr;
  }

  .thinking-content {
    overflow: hidden;
    min-height: 0;
    padding: var(--space);
    padding-top: 0;
    font-size: 0.88em;
    opacity: 0.75;
    border-top: 1px solid var(--thinking-divider);
  }
}

@keyframes thinking-dots {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
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
  color: var(--md-text);
  line-height: 1.6;

  h1, h2, h3, h4, h5, h6 {
    color: var(--md-heading);
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
  }

  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }

  strong, b {
    font-weight: 700;
    color: var(--md-strong);
  }

  em, i {
    font-style: italic;
    color: var(--md-em);
  }

  code {
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
    overflow: scroll;
  }

  pre {
    border-radius: 6px;
    overflow-x: scroll;
    width: calc(100% - var(--space) * 2);
    margin: 1rem 0;

    code {
      padding: 0;
    }
  }

  a {
    color: var(--md-link);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      color: var(--md-link-hover);
      text-decoration: underline;
    }
  }

  ul, ol {
    margin: 0.5rem 0;
    padding-left: 2rem;
    color: var(--md-list-text);

    li {
      margin: 0.25rem 0;
      color: var(--md-list-item);

      &::marker {
        color: var(--md-list-marker);
      }
    }

    ul, ol {
      margin: 0.25rem 0;

      li::marker {
        color: var(--md-list-marker-nested);
      }
    }
  }

  blockquote {
    border-left: 4px solid var(--md-blockquote-border);
    padding-left: 1rem;
    margin: 1rem 0;
    color: var(--md-blockquote-text);
    font-style: italic;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    background-color: var(--md-table-bg);
    border-radius: 6px;
    overflow: hidden;

    thead {
      background-color: var(--md-table-header);

      th {
        color: var(--md-table-header-text);
        font-weight: 700;
        padding: 0.75rem;
        text-align: left;
        border-bottom: 2px solid var(--md-table-border);
        word-break: break-all;
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid var(--md-table-row-border);

        word-break: break-all;

        &:hover {
          background-color: var(--md-table-row-hover);
        }

        &:last-child {
          border-bottom: none;
        }
      }

      td {
        padding: 0.75rem;
        color: var(--md-table-text);
      }
    }
  }

  hr {
    border: none;
    border-top: 2px solid var(--md-hr);
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

