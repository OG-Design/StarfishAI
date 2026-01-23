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
    <div id="title-area">
      <input type="text" v-model="threadTitle" @change="handleThreadChange" :style="{width: (title.length || 10) + 'ch'}">
    </div>
    <ul id="thread" ref="threadList">
      <li
        class="message"
        :class="{'message-user': message.role === 'user'}"
        v-for="(message, index) in messages"
        :key="index"
        v-html="md.render(message.content ?? '')"
      ></li>
      <li v-if="currentMessage" class="message" v-html="md.render(currentMessage)">
      </li>
    </ul>
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

