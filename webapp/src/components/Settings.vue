<script setup>
import { nextTick, onMounted, ref } from 'vue';

import { apiFetch, apiBase, resetApiBase, navigateHome } from '../composables/useApi';
import { nvidiaConfig, cpuConfig } from '../composables/useAiConfig';


const emit = defineEmits(["openSettings", "updateModels"]);

function handleSettingsMenu() {
    emit("openSettings");
}

function handleSaveApi() {
    const url = apiBase.value.trim();
    if (!url) return;
    const dest = new URL(url);
    dest.searchParams.set('returnTo', window.location.href);
    window.location.href = dest.toString();
}

function handleResetApi() {
    resetApiBase();
    navigateHome();
}

function handleGroupChange() {
    const group = groups.value.find(g => g.userGroup_idUserGroup === selectedGroupId.value);
    if (group) {
        selectedGroup.value = group;
        emit('updateSelectedGroup', group);
        console.log("Changed selected group:", group);
        fetchModelsByGroup();
    } else {
        console.warn("No group found for id:", selectedGroupId.value);
    }
}

const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";

const isLoading = ref(false);

const models = ref([]);
const groups = ref([]);
const selectedGroup = ref({});
const addName = ref("");
const addFullName = ref("");
const responseAddModel = ref("");
const editMode_models = ref(false);
const selectedModels = ref([]);
const selectedGroupId = ref(null);
const downloadPercentage = ref("");
const ollamaConfigs = ref([]);
const selectedConfig = ref("");
const systemServices = ref([]);

import { watch } from 'vue';
watch(selectedGroup, (newVal) => {
    console.log('selectedGroup changed:', newVal);
});

// fetch groups accessible by user (userGroup contains models)
async function fetchUserGroup() {
    const res = await apiFetch("/api/user/userGroup", {
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    })

    const groupsRes = await res.json();

        groups.value = groupsRes;
        if (groupsRes.length > 0) {
            selectedGroupId.value = groupsRes[0].userGroup_idUserGroup;
            selectedGroup.value = groupsRes[0];
            emit('updateSelectedGroup', groupsRes[0]);
        }
        console.log("Selected group:", selectedGroup.value);
        console.log("UserGroups: \n", groups.value);
}


async function fetchModelsByGroup() {

    // debug
    // console.log("selectedGroup id: \n", selectedGroup.value.userGroup_idUserGroup)

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

    models.value = await res.json();

    // debug
    console.log("In Settings: models: \n", await models.value);

    emit("updateModels", models.value); // emit to parent to pass from parent to OpenThread, this allows the list of models to be displayed
}



async function addModelToGroup() {
    console.log("running addModelToGroup()");

    isLoading.value=true;
    responseAddModel.value="Loading...";

    const params = new URLSearchParams({
            modelName: addName.value,
            modelFullName: addFullName.value,
            groupName: selectedGroup.value.name,
            groupId: selectedGroup.value.userGroup_idUserGroup
    });

    console.log("addModelToGroup, Body: \n", params);
    
    try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${apiBase.value}/api/ai/model/add?${params.toString()}`, true);
    // xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    xhr.setRequestHeader('Accept', 'text/event-stream');

    let lastIndex = 0;

    xhr.onprogress = () => {
        const newData = xhr.responseText.substring(lastIndex);
        lastIndex = xhr.responseText.length;

        const lines = newData.split('\n');
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    const data = JSON.parse(line.substring(6));
                    console.log(data.status, data.progress + '%')
                    downloadPercentage.value=data.progress;
                } catch (err) {
                    console.error("Parse error:", err);
                }
            }
        }
    };

    xhr.onload = () => {
        console.log("Model added successfully");
        isLoading.value = false;
        responseAddModel.value = "Complete";
        fetchModelsByGroup();
    };

    xhr.onerror = () => {
        console.error("Error occured while downloading");
        isLoading.value = false;
        responseAddModel.value = "Error";
    }

    xhr.send();

    } catch (err) {
        console.error("XHR error:", err);
    }
}



async function getOllamaConfig() {
    console.log("running getOllamaConfig()");
    const res = await apiFetch('/api/system/compose/ollama/get',{
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    });

    const data = await res.json();
    ollamaConfigs.value = data;
    console.log("Response getOllamaConfig():", data);

    // Set selectedConfig after configs are loaded
    const savedConfig = localStorage.getItem("ollamaConfig");
    if (savedConfig && ollamaConfigs.value.includes(savedConfig)) {
        selectedConfig.value = savedConfig;
    } else {
        selectedConfig.value = "";
    }
}

getOllamaConfig();

async function handleSelectedConfig() {
    if (selectedConfig.value) {
        localStorage.setItem("ollamaConfig", selectedConfig.value);
    } else {
        localStorage.removeItem("ollamaConfig");
    }

    const body = JSON.stringify({
        preset: selectedConfig.value
    });

    const res = await apiFetch("/api/system/compose/ollama/change", {
        method: 'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body
    });

    console.log("Response handleSelectConfig", await res.json());

}

async function handleLoadOllamaConfig() {
    const res = await apiFetch("/api/system/compose/ollama/restart");
    const data = await res.json();
    console.log("handleLoadOllamaConfig() response:", data);
}

function toggleEditMode() {
    editMode_models.value = !editMode_models.value;
}

function deleteSelectedModels() {
    console.log("Deleting models: \n", selectedModels.value);
}

async function checkSystemServices() {
    isLoading.value=true
    const res = await apiFetch('/api/system/health', {
        method: 'GET',
        headers: {
            'Content-Type':'application/json'
        }
    })

    const data = await res.json();

    console.log("checkSystemServices():", data);

    systemServices.value=data;
    isLoading.value=false
}

onMounted(async () => {
    nextTick();
    await checkSystemServices();
    await fetchUserGroup();
    await fetchModelsByGroup();

});


</script>

<template>
    <div class="fill">
        <ul id="settings-menu">
            <li id="settings-header">
                <h1>Settings</h1>
                <button id="close-btn" @click="handleSettingsMenu">x</button>
            </li>
            <li class="flex-column">
                <h2>Remote Connection</h2>
                <div class="flex-row" style="gap: var(--space); align-items: center;">
                    <label for="settings-url">Starfish API Address</label>
                    <input id="settings-url" type="text" placeholder="http://192.168.1.x:3000" v-model="apiBase">
                    <button @click="handleSaveApi">Connect</button>
                    <button @click="handleResetApi">Reset</button>
                </div>
            </li>
            <li class="flex-column">
                <h2>Models</h2>

                <div class="flex-row">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Full Name</th>
                                <th v-if="!editMode_models">Status</th>
                                <th v-if="editMode_models"><button @click="deleteSelectedModels">Delete</button></th>
                                <th><button @click="toggleEditMode">...</button></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!editMode_models" v-for="(model, index) in models" :key="index">
                                <th>{{ model.modelName }}</th>
                                <th>{{ model.modelFullName }}</th>
                                <th><div class="status-ready"></div></th>
                            </tr>
                            <tr v-if="editMode_models" v-for="(model, index) in models" :key="index">
                                <th>{{ model.modelName }}</th>
                                <th>{{ model.modelFullName }}</th>
                                <th><input type="checkbox" v-model="selectedModels" :value="model" :key="index"></th>
                            </tr>
                            <tr>
                                <th><input type="text" name="" id="modelName" placeholder="name" v-model="addName"></th>
                                <th><input type="text" name="" id="modelFullName" placeholder="fullname" v-model="addFullName"></th>
                                <th><button type="button" @click="addModelToGroup">Add</button></th>
                                <th>
                                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""><span>{{ downloadPercentage }}%</span></div>
                                    <div v-else class="loading-gif-container-settings"></div>
                                </th>
                            </tr>
                        </tbody>
                    </table>
                    <select v-model="selectedGroupId" @change="handleGroupChange">
                        <option v-for="(group, index) in groups" :value="group.userGroup_idUserGroup" :key="index">
                            {{ group.name }}
                        </option>
                    </select>
                </div>
            </li>
            <li
            class="flex-column">
                <h2>System</h2>

                <div class="tile-column">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="service in systemServices">
                                <th>{{ service.name }}</th>
                                <th>{{ service.status }}</th>
                                <th>
                                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
                                    <div v-else class="loading-gif-container-settings"></div>
                                </th>
                            </tr>
                        </tbody>
                    </table>

                    <button @click="checkSystemServices">Refresh</button>
                </div>

                <div class="tile-column">
                    <h3>AI Proccessor</h3>
                    <select @change="handleSelectedConfig" :value="selectedConfig" v-model="selectedConfig">
                        <option v-for="config in ollamaConfigs" :value="config">{{ config }}</option>
                    </select>
                    <button @click="handleLoadOllamaConfig">Load Config</button>
                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
                    <div v-else class="loading-gif-container-settings"></div>
                </div>
            </li>
        </ul>
    </div>
</template>

<style lang="scss">


h1 {
    font-size: 36px;
}

.fill {
    width: 100vw;
    height: 100vh;

    position: absolute;
    z-index: 101;

    padding: calc($settings-space * 10);
    padding-left: calc($settings-space * 25);
    padding-right: calc($settings-space * 25);

    box-sizing: border-box;

    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
}
#settings-menu {
    width: 100%;

    height: 100%;

    background-color: $bg-1;

    border-radius: $border-radius;
    border: 1px solid $key-1;

    offset: 0;
    list-style: none;
    li {

        width: calc(100% - $settings-space * 2);
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        padding: $settings-space;
        box-sizing: border-box;

        gap: $settings-space;

        border-radius: $border-radius;

        background-color: $bg-1;
    }
    #settings-header {
        background: transparent;
    }
    .flex-column {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: start;

    }
    .flex-row {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: $settings-space;
    }
    select {
        width: 30%;
        height: fit-content;

        font-size: 18px;
        border-radius: $border-radius;
        border: 1px solid $key-1;
    }
}

.tile-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: clamp(200px, 50%, 300px);
    background-color: $bg-ac-1;
    border-radius: $border-radius;
    padding: $space;
    
    h3 {
        align-self: flex-start;
    }

    select {
        min-width: 200px;
    }
}

.table {
    width: 100%;
    max-width: 400px;
    height: fit-content;
    background-color: $bg-ac-1;
    border-radius: $border-radius;
    padding: $settings-space;

    border-collapse: separate;
    border-spacing: $settings-space calc($settings-space / 2);

    tbody {
        tr {
            th {
                font-weight:normal;
            }
        }
    }
    input {
        color: $text-2;
        background-color: $bg-ac-1;
        border: 1px solid $key-1;
        border-radius: $border-radius;
        padding: $space-1;
    }
}

.status-ready {
    height: 25px;
    width: 25px;
    background-color: green;
    border-radius: 100px;
}

#close-btn {
    background-color: transparent;
    background: transparent;
    border: none;
    color: $text-2;

}

$scale-gif:50px;
.loading-gif-container-settings {
    width: fit-content;
    height: $scale-gif;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    span {
        height: 50%;
    }
}
.loading-gif-settings {
    width: $scale-gif;
}

@media (max-width: 1200px) {
    .fill {
        padding: 1rem;
    }
    #settings-menu {
        .flex-row {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            gap: $settings-space;
        }
    }
}
</style>