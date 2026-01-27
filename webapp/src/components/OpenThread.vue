<script setup lang="ts">

import {ref, onMounted, computed, watch, nextTick} from 'vue';

import MarkdownIt from 'markdown-it';

import { sendPrompt, aiChunks, socket } from '../composables/useSocket';


const md = new MarkdownIt();

const props = defineProps<{title: string, index: number, idThread: number, models: any[]}>();

// console.log(props);

const messages = ref<any[]>([]);
const personality = ref<string>('');

const emit = defineEmits(['updateThreadTitle']);

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

  const res = await fetch(`/api/ai/thread/id/${thread}/messages`);
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

  sendPrompt(props.idThread, message, currentModel.value.modelFullName); // model: llama3 llama3.2 smollm2:135m dolphin-phi

  console.log("Selected model:", currentModel.value);

  // log chunks
  console.log(aiChunks);

  

  // on ai_complete
  socket.once('ai_complete', () => {
    // set isLoading to false
    isLoading.value=false;
  });

  // give feedback on error aswell as setting isLoading to false
  socket.once('error', (err: any) => {
    console.error("Socket error:", err);
    isLoading.value = false;
    alert("Error occurred while processing your request.\n Error: "+err.message);
  })

  socket.once('connect_error', (err: any) => {
    console.error("Connection error:", err);
    isLoading.value = false;
    alert("Connection error occurred");

  })

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






async function handlePersonalityChange() {
  const body = {
    thread: thread,
    personality: personality.value
  }

  const res = await fetch("/api/ai/thread/alter/personality", {
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

// replace by API provided model list
const models = ref(props.models)
const currentModel = ref(models.value[0]);

console.log(props.models)
console.log("Models: \n", models);



</script>

<template>
  <main id="thread-main">
    <!-- The title of the thread -->
    <div id="top-menu">
      <input type="text" v-model="threadTitle" @change="handleThreadChange" :style="{width: (title.length || 10) + 'ch'}">
      <select name="" id="models" v-model="currentModel">
        <option v-for="(model, index) in models" :key="index" :value="model">{{model.modelName}}</option>
      </select>

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
      <!-- Prints the latest message -->
      <li v-if="currentMessage" class="message markdown-content" v-html="md.render(currentMessage)">
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

$border-radius: 1rem;

$space: 1rem;

#system-prompt {
  width: calc(100% - $space * 2);
  height: auto;
  min-height: 50px;

  background-color: #1E2230;

  border: solid 1px #1E2230;
  border-radius: $border-radius;

  margin: $space;
  margin-bottom: 0;

  padding: $space;

  box-sizing: border-box;

  resize: none;

  // font-style: italic;
  color: #888b94;

  transition: .2s;

  &:hover {
    border: 1px solid #8B5CF6;
  }
}

#top-area {
  height: 10%;
  width: 100%;

  position: absolute;
  z-index: 10;
  top: 0;

}

#thread-main {

  display: flex;
  flex-direction: column;


  margin: 0;

  margin-top: 10px; /* fix for title area */

  grid-area: thread;

  background-color: #12141A;
}

#thread {
  min-width: calc(100% - $space * 2);
  height: calc(100% - $space * 2);
  width: calc(100% - $space * 2);

  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;

  overflow: scroll;

  margin: $space;
  margin-bottom: 0;
  padding-bottom: $space;
  gap: calc($space * 5);

  box-sizing: border-box;

}

#prompt {
  width: calc(100% - $space );
  height: 20%;
  background-color: #171A21;

  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  gap: $space;
  margin: 0;
  margin-left: calc($space / 2);
  // margin-right: calc($space / 2);
  margin-bottom: $space;

  border-radius: $border-radius;

  box-sizing: border-box;

  textarea {

    width: 80%;
    height: calc(100% - $space * 2);

    resize: none;

    background-color: #1E2230;

    border: solid 1px #1E2230;
    border-radius: $border-radius;

    &:active, &:focus {
      border: solid 1px #646cff;
    }

    transition: .2s;

    &:hover {
      border: 1px solid #646cff;
    }

  }

  button {
    $btn-size: 75px;

    width: $btn-size;
    height: $btn-size;

    border: none;
    border-radius: $border-radius * 10000;

    background-color: hsla(240, 100%, 74%, 12%);
    color: white;
    font-weight: 600;

    &:hover {
      

      width: calc($btn-size * 1.05);
      height: calc($btn-size * 1.05);

      background-color: hsla(240, 100%, 74%, 50%);
      cursor: pointer;
    }

    &:focus {
      width: calc($btn-size * 1.01);
      height: calc($btn-size * 1.01);


      background-color: hsla(240, 100%, 74%, 50%);
    }

    &:disabled {
      background-color: #44475a;
      cursor: not-allowed;
    }
  }


}
.message {
  width: 70%;
  max-width: 70%;
  list-style-type: none;
  offset: 0;

  box-sizing: border-box;

  padding: $space;

  border-radius: $border-radius;
  border: 1px solid #171A21;

  background-color: #171A21;

  transition: .2s;

}

.message:hover {
  border: 1px solid #8B5CF6;
}

.message-user {
  width: 70%;
  max-width: 70%;
  align-self: flex-end;
  justify-items: end;
}
.message-user:hover {
  border: 1px solid #646cff;
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
  }

  pre {
    background-color: #0f1e2b;
    border: 1px solid #2a4a5e;
    border-radius: 6px;
    padding: 1rem;
    overflow-x: auto;
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
      }
    }

    tbody {
      tr {
        border-bottom: 1px solid #2d5a7b;

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
</style>

