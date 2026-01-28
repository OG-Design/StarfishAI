<script setup lang="ts">

import ThreadsMenu from './components/ThreadsMenu.vue'
import OpenThread from './components/OpenThread.vue';
import Login from './components/Login.vue';
import Settings from './components/Settings.vue';


import TopMenu from './components/TopMenu.vue';

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

  // console.log("Changing selected threads value from \n", selectedThread.value);
  selectedThread.value=data[0]; // set the selected thread to the first available thread
  // console.log("to \n", selectedThread.value);

  // console.log("Threads available: \n", threadsAvailable.value);
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

    // check if models or groups stored locally
    if(!storedModels || !storedSelectedGroup) {
      fetchModelsByGroup();
    }

    return;
  }

  // console.log("Session: ", await data);
}

// run session check on app start
checkSession();

// Open thread by updating selectedThreads value
function handleOpenThread_inParent(payload: thread) {
  // console.log("Running ", handleOpenThread_inParent);

  // console.log(payload);

  selectedThread.value = {idThread: payload.idThread, title: payload.title};

  // console.log("Thread selected:", selectedThread.value);

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
  checkSession(); // update on updateThreadsAvailable to render if authenticated components
  getAllThreads();
}

const settingsIsOpen = ref(false);

function handleOpenSettings() {
  console.log("Opening settings in parent.");
  settingsIsOpen.value = !settingsIsOpen.value;
  console.log("settingsIsOpen:" )
}


function updateModels(payload: any) {
  console.log("Updating modelsAvailable with:\n", payload);

  if( payload ) {
  models.value=payload;
  }

  if (models.value && models.value.length > 0) {
    localStorage.setItem("models", JSON.stringify(models.value));
  }

  if (selectedGroup.value && selectedGroup.value.userGroup_idUserGroup) {
    localStorage.setItem("selectedGroup", JSON.stringify(selectedGroup.value));

    console.log("Selecting group:", selectedGroup.value.userGroup_idUserGroup, " ", selectedGroup.value.name);
  }





}



async function fetchUserGroup() {
    const res = await fetch("/api/user/userGroup", {
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    })

    const groupsRes = await res.json()

    groups.value=groupsRes;


    // check if stored locally
    if (!storedSelectedGroup) {
      selectedGroup.value = await groupsRes[0];
      fetchModelsByGroup();
    }

    console.log("Selected group:", groupsRes[0]);

    console.log("UserGroups: \n", await groups.value);

}

fetchUserGroup();

async function fetchModelsByGroup() {

    console.log("selectedGroup id: \n", selectedGroup.value.userGroup_idUserGroup);

    const body = {
        group: {
            name: selectedGroup.value.name,
            idUserGroup: selectedGroup.value.userGroup_idUserGroup
        }
    }

    const res = await fetch("/api/ai/model/all", {
        method: 'POST',
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify(body)
    })

    // set models
    models.value = await res.json();
    localStorage.setItem("models", JSON.stringify(models.value));
    localStorage.setItem("selectedGroup", JSON.stringify(selectedGroup.value));

    console.log("App, Models: \n", models.value);
    console.log("Selected group:", selectedGroup.value);
}

const storedModels = localStorage.getItem("models");
const storedSelectedGroup = localStorage.getItem("selectedGroup");


const models:any = ref(storedModels ? JSON.parse(storedModels) : []);
const groups = ref([]);
const selectedGroup:any = ref(storedSelectedGroup ? JSON.parse(storedSelectedGroup): []);

console.log("LocalStorage: \n", localStorage.getItem("models"), "\n", localStorage.getItem("selectedGroup"));

</script>

<template>
  <!-- Handles login -->
  <Login v-if="!authenticated" :authenticated="authenticated" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>

  <TopMenu @openSettings="handleOpenSettings"/>
  <template v-if="settingsIsOpen" :key="settingsIsOpen">
    <Settings @updateModels="updateModels" @openSettings="handleOpenSettings"/>
  </template>
  <template v-if="authenticated" :key="authenticated">
    <!-- Handles thread selection through handleOpenThread_inParent and in child as handleOpenThread -->
    <ThreadsMenu :threadsAvailable="threadsAvailable" @openThread="handleOpenThread_inParent" @updateThreadsAvailable="handleUpdateThreadsAvailable" @updateModels="updateModels"/>
    <!-- Contains the open thread -->
    <OpenThread :title="selectedThread.title || 'No thread selected'" :index="selectedThread.idThread || null" :idThread="selectedThread.idThread" :key="selectedThread.idThread" @updateThreadTitle="handleUpdateThreadTitle" :models="models"/>
  </template>
</template>

<style lang="scss" scoped>
$border-radius: 2rem;
$space: 1rem;
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
