<script setup lang="ts">

import ThreadsMenu from './components/ThreadsMenu.vue'
import OpenThread from './components/OpenThread.vue';
import Login from './components/Login.vue';
import Settings from './components/Settings.vue';
import TopMenu from './components/TopMenu.vue';
import Profile from './components/Profile.vue';

import { apiFetch } from './composables/useApi';
import { connectSocket } from './composables/useSocket';

import { ref } from 'vue'

// imports selectedThread type
import type {selectedThread} from './types/selectedThread'

// imports threadsAvailable from a globally available type between api and webapp
import type thread from '../../types/thread';

const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";
const isFirstRun = isElectron && !localStorage.getItem("isFirstRun");

if (isFirstRun) {
  localStorage.clear();
  localStorage.setItem("isFirstRun", "false");
}

// make authenticated state ref
const authenticated = ref(isElectron);

// Make threads storage
const threadsAvailable = ref<thread[]>([]);

// console.log(threadsAvailable.value);

// creates reference selectedThread
const selectedThread = ref({title:"",idThread:0});
selectedThread.value={title:"",idThread:0};

const storedModels = localStorage.getItem("models");
const storedSelectedGroup = localStorage.getItem("selectedGroup");

const models:any = ref(storedModels ? JSON.parse(storedModels) : []);
const groups = ref([]);
const selectedGroup:any = ref(storedSelectedGroup ? JSON.parse(storedSelectedGroup): []);


// fetch all threads available to user
async function getAllThreads() {
  const res = await apiFetch('/api/ai/thread/all');
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
  const res = await apiFetch('/api/auth/check', { credentials: 'include'});

  const loggedIn = await res.json();

  // In Electron mode, the backend auto-authenticates every request,
  // so keep authenticated=true even if the cookie-based check fails.
  if (isElectron) {
    authenticated.value = true;
  } else {
    // change the authenticated value to true or false based on result
    authenticated.value = !!(loggedIn && loggedIn.isAuth);
  }

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

// In Electron mode, Login never mounts, so connect the socket here
if (isElectron) {
  connectSocket();
}

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

const profileIsOpen = ref(false);

function handleOpenProfile() {
  console.log("Opening profile in parent.");
  profileIsOpen.value=!profileIsOpen.value;
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

function handleUpdateSelectedGroup(group: any) {
  selectedGroup.value = group;
  localStorage.setItem("selectedGroup", JSON.stringify(group));
  console.log("App.vue: Synced selected group:", group);
}



async function fetchUserGroup() {
    const res = await apiFetch("/api/user/userGroup", {
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

    const res = await apiFetch("/api/ai/model/all", {
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


console.log("LocalStorage: \n", localStorage.getItem("models"), "\n", localStorage.getItem("selectedGroup"));

const rotateMenuButton = ref(false);
function toggleMenu() {
  console.log("Toggling menu");
  rotateMenuButton.value = !rotateMenuButton.value;
  document.getElementById("app")?.classList.toggle("menu-expanded");
}

function handleLogout() {
  authenticated.value=false
}

let devMode = false;
let alphaMode = true;

</script>

<template>
  <div v-if="devMode" style="
  max-width: 0;
  max-height: 0;
  margin-left: calc(50vw - 125px);
  margin-top: 5rem;
  position: absolute;
  z-index: 10000;
  pointer-events: none;
  ">
  <p style="
  width: 250px;
  height: fit-content;
  font-size: 20px;
  background-color: hsla(0, 100%, 50%, .25);
  color: hsla(0, 100%, 70%, 1);
  text-align: center;
  margin: 0 auto;
  
  ">
    Warning, this App is in dev mode! It may be unstable
  </p>
  </div>
  <div v-if="alphaMode" style="
  max-width: 0;
  max-height: 0;
  margin-left: calc(50vw - 125px);
  margin-top: 5rem;
  position: absolute;
  z-index: 10000;
  pointer-events: none;
  ">
  <p style="
  width: 250px;
  height: fit-content;
  font-size: 20px;
  background-color: hsla(60, 100%, 50%, .25);
  color: hsla(60, 100%, 70%, 1);
  text-align: center;
  margin: 0 auto;
  
  ">
    Warning, this App is in alpha! It may be unstable
  </p>
  </div>

  <button id="toggle-menu-button" v-on:click="toggleMenu" :class="rotateMenuButton ? 'rotate-menu-button' : ''">→</button>

  <!-- Handles login -->
  <Login v-if="!authenticated" :authenticated="authenticated" @updateThreadsAvailable="handleUpdateThreadsAvailable"/>

  <TopMenu @openSettings="handleOpenSettings" @openProfile="handleOpenProfile"/>
  <template v-if="settingsIsOpen" :key="settingsIsOpen">
    <Settings @updateModels="updateModels" @openSettings="handleOpenSettings" @updateSelectedGroup="handleUpdateSelectedGroup"/>
  </template>
  <template v-if="profileIsOpen" :key="profileIsOpen">
    <Profile @openProfile="handleOpenProfile" @logout="handleLogout"/>
  </template>
  <template v-if="authenticated" :key="authenticated">
    <!-- Handles thread selection through handleOpenThread_inParent and in child as handleOpenThread -->
    <ThreadsMenu :threadsAvailable="threadsAvailable" @openThread="handleOpenThread_inParent" @updateThreadsAvailable="handleUpdateThreadsAvailable" @updateModels="updateModels"/>
    <!-- Contains the open thread -->
    <OpenThread
    :title="selectedThread && selectedThread.title ? selectedThread.title : 'No thread selected'"
    :index="selectedThread && selectedThread.idThread ? selectedThread.idThread : 0"
    :idThread="selectedThread && selectedThread.idThread ? selectedThread.idThread : 0"
    :key="selectedThread && selectedThread.idThread ? selectedThread.idThread : 0"
    @updateThreadTitle="handleUpdateThreadTitle"
    :models="models"/>
  </template>
</template>

<style lang="scss" scoped>
#toggle-menu-button {
  width: 50px;
  height: 50px;

  z-index: 101;

  position: absolute;
  top: 50%;
  left: 0;
  margin: var(--space);
  display: none;

  background: none;
  border: none;

  font-size: 24px;
  font-weight: bold;
}

@media screen and (max-width:500px) {
  #toggle-menu-button {
    display: block;
  }
  .rotate-menu-button {
    transform: rotateY(180deg);
  }
}


$border-radius: 2rem;
$space: 1rem;
</style>
