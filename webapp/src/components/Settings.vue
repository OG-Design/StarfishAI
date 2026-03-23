<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { apiFetch, apiBase, resetApiBase, navigateHome } from '../composables/useApi';
import { nvidiaConfig, cpuConfig } from '../composables/useAiConfig';

import CustomSelect from './CustomSelect.vue';

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

function handleGroupChange(selected) {
    // selected is the object from CustomSelect: { key, value }
    const group = groups.value.find(g => g.userGroup_idUserGroup === selected.value);
    if (group) {
        selectedGroup.value = group;
        selectedGroupId.value = group.userGroup_idUserGroup;
        emit('updateSelectedGroup', group);
        console.log("Changed selected group:", group);
        fetchModelsByGroup();
    } else {
        console.warn("No group found for id:", selected.value);
    }
}

const isElectron = typeof window !== "undefined" && window.location.protocol === "file:";

const isLoading = ref(false);

const models = ref([]);
const groups = ref([]);
const groupsReType = computed(() =>
    groups.value.map(group => ({
        key: group.name,
        value: group.userGroup_idUserGroup
    }))
);
const selectedGroup = ref({});
const selectedGroupReType = computed(() => ({
    key: selectedGroup.value?.name ?? '',
    value: selectedGroup.value?.userGroup_idUserGroup ?? ''
}))
const addName = ref("");
const addFullName = ref("");
const addThinking = ref({ key: 'Off', value: 'false' });
const responseAddModel = ref("");
const editMode_models = ref(false);
const selectedModels = ref([]);
const selectedGroupId = ref(null);
const downloadPercentage = ref("");
const ollamaConfigs = ref([]);
const ollamaConfigsReType = computed(() =>
    ollamaConfigs.value.map(config => ({
        key: config,
        value: config
    }))
);

function handleThinkingChange(selected) {
    addThinking.value=selected;
}

const selectedConfig = ref("");
const selectedConfigReType = computed(() => ({
    key: selectedConfig.value ?? '',
    value: selectedConfig.value ?? ''
}))

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

    const data = await res.json();
    console.log(data);

    const mappedData = data.map((model) => {
        const mapModel = {
            modelName: model.modelName,
            modelFullName: model.modelFullName,
            thinking: model.thinkingLevel,
            idGroup: selectedGroupId.value
        };
        return mapModel;
    })

    models.value = mappedData;



    // debug
    console.log("In Settings: models: \n", models.value);

    emit("updateModels", models.value); // emit to parent to pass from parent to OpenThread, this allows the list of models to be displayed
}



async function addModelToGroup() {
    console.log("running addModelToGroup()");

    isLoading.value=true;
    responseAddModel.value="Loading...";

    const params = new URLSearchParams({
            modelName: addName.value,
            modelFullName: addFullName.value,
            modelThinkingLevel: addThinking.value.value,
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

async function handleSelectedConfig(selected) {
    // Accepts the selected object from CustomSelect: { key, value }
    if (selected && selected.value) {
        selectedConfig.value = selected.value;
        localStorage.setItem("ollamaConfig", selected.value);
    } else {
        selectedConfig.value = "";
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

async function deleteSelectedModels() {

    const body = {
        models: selectedModels.value
    }

    console.log("Trying to delete models:", selectedModels.value)


    const res = await apiFetch("/api/ai/models/delete", {
        method: 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
    })

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
                <div class="tile-row width-70 gap">
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
                                <th>Display Name</th>
                                <th>Model Name</th>
                                <th>Thinking Level</th>
                                <th v-if="!editMode_models">Status</th>
                                <th v-if="editMode_models"><button @click="deleteSelectedModels">Delete</button></th>
                                <th><button @click="toggleEditMode" v-if="selectedGroup.permissionLevel==='admin'">...</button></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="!editMode_models" v-for="(model, index) in models" :key="index">
                                <td data-label="Display Name">{{ model.modelName }}</td>
                                <td data-label="Model Name">{{ model.modelFullName }}</td>
                                <td data-label="Thinking">{{ model.thinking }}</td>
                                <td data-label="Status"><div class="status-ready"></div></td>
                            </tr>
                            <tr v-if="editMode_models" v-for="(model, index) in models" :key="index">
                                <td data-label="Display Name">{{ model.modelName }}</td>
                                <td data-label="Model Name">{{ model.modelFullName }}</td>
                                <td data-label="Thinking">{{ model.thinking }}</td>
                                <td data-label="Select"><input type="checkbox" v-model="selectedModels" :value="model" :key="index"></td>
                            </tr>
                            <tr v-if="selectedGroup.permissionLevel==='admin'">
                                <td data-label="Display Name"><input type="text" name="" id="modelName" placeholder="name" v-model="addName"></td>
                                <td data-label="Model Name"><input type="text" name="" id="modelFullName" placeholder="fullname" v-model="addFullName"></td>
                                <td data-label="Model Thinking Level"><CustomSelect :values="[{key: 'Regular Thinking', value: 'true'},{key: 'Off', value: 'false'},{key: 'Low Thinking', value: 'low'},{key: 'Medium Thinking', value: 'medium'},{key: 'High Thinking', value: 'high'}]" :current-selection="addThinking" :update-handler="handleThinkingChange" direction="down"/></td>
                                <td data-label="Add"><button type="button" @click="addModelToGroup">Add</button></td>
                                <td data-label="Progress">
                                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""><span>{{ downloadPercentage }}%</span></div>
                                    <div v-else class="loading-gif-container-settings"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- <select v-model="selectedGroupId" @change="handleGroupChange">
                        <option v-for="(group, index) in groups" :value="group.userGroup_idUserGroup" :key="index">
                            {{ group.name }}
                        </option>
                    </select> -->
                    <div class="selector-constraint">
                        <CustomSelect :values="groupsReType" :currentSelection="selectedGroupReType" :updateHandler="handleGroupChange" direction="down" />
                    </div>
                </div>
            </li>
            <li
            class="flex-column">
                <h2>System</h2>

                <div class="flex-row justify-start">
                <div class="tile-row">
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
                                <td data-label="Service">{{ service.name }}</td>
                                <td data-label="Status">{{ service.status }}</td>
                                <td data-label="Action">
                                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
                                    <div v-else class="loading-gif-container-settings"></div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <button @click="checkSystemServices">Refresh</button>
                </div>

                <div class="tile-column">
                    <h3>AI Proccessor</h3>
                    <!-- <select @change="handleSelectedConfig" :value="selectedConfig" v-model="selectedConfig">
                        <option v-for="config in ollamaConfigs" :value="config">{{ config }}</option>
                    </select> -->
                    <div class="selector-constraint">
                        <CustomSelect direction="right" :values="ollamaConfigsReType" :currentSelection="selectedConfigReType" :updateHandler="handleSelectedConfig" />
                    </div>
                    <button @click="handleLoadOllamaConfig" >Load Config</button>
                    <div v-if="isLoading" class="loading-gif-container-settings"><img class="loading-gif-settings" src="/animation/LoadingDroplet.gif" alt="Loading..." srcset=""></div>
                    <div v-else class="loading-gif-container-settings"></div>
                </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>


h1 {
    font-size: 36px;
}

.fill {
    width: 100vw;
    height: 100vh;

    position: absolute;
    z-index: 101;

    padding: calc(var(--settings-space) * 10);
    padding-left: calc(var(--settings-space) * 25);
    padding-right: calc(var(--settings-space) * 25);

    box-sizing: border-box;

    backdrop-filter: blur(8px);
    display: flex;
    justify-content: start;
    align-items: start;
}
#settings-menu {
    position: static;
    width: 100%;

    height: fit-content;

    background-color: var(--bg-1);

    border-radius: var(--border-radius);
    border: 1px solid var(--key-1);

    offset: 0;
    list-style: none;
    li {

        width: calc(100% - var(--settings-space) * 2);
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        padding: var(--settings-space);
        box-sizing: border-box;

        gap: var(--settings-space);

        border-radius: var(--border-radius);

        background-color: var(--bg-1);
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
        justify-content: flex-start;
        align-items: stretch;
        gap: var(--settings-space);
        border-radius: var(--border-radius);
    }

    select {
        width: 30%;
        height: fit-content;

        font-size: 18px;
        border-radius: var(--border-radius);
        border: 1px solid var(--key-1);
    }
}

.tile-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: clamp(200px, 50%, 300px);
    height: fit-content;
    background-color: var(--bg-ac-1);
    border-radius: var(--border-radius);
    padding: var(--space);

    h3 {
        align-self: flex-start;
    }

    select {
        min-width: 200px;
    }
}

.tile-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    width: clamp(200px, 50%, 300px);
    background-color: var(--bg-ac-1);
    border-radius: var(--border-radius);
    padding: var(--space);

    h3 {
        align-self: flex-start;
    }

    select {
        min-width: 200px;
    }
}

.width-70 {
    min-width: clamp(200px, 70%, 500px);
}

.gap {
    gap: var(--space-1);
}

.selector-constraint {
    max-height: var(--font-size-1);
}

.table {
    width: 100%;
    flex: 1 1 0;
    min-width: 0;
    display: table;
    height: fit-content;
    background-color: var(--bg-ac-1);
    border-radius: var(--border-radius);
    padding: var(--settings-space);

    border-collapse: separate;
    border-spacing: var(--settings-space) calc(var(--settings-space) / 2);

    tbody {
        tr {
            th {
                font-weight:normal;
            }
        }
    }
}

input {
    color: var(--text-2);
    background-color: var(--bg-ac-1);
    border: 1px solid var(--key-1);
    border-radius: var(--border-radius);
    padding: var(--space-1);
}

.status-ready {
    height: 25px;
    width: 25px;
    background-color: green;
    border-radius: 100px;
}

button {
    background-color: var(--key-1);

    max-width: 100px;

    margin: var(--space);
    padding: var(--space-1);
    border: none;
    border-radius: var(--border-radius);

    justify-self: center;

    &:hover {
        background-color: var(--key-1-bright);
    }

    &:active {
        background-color: var(--key-1-alpha);
    }
}

.justify-start {
    justify-content: start!important;
}

#close-btn {
    background-color: transparent;
    background: transparent;
    border: none;
    color: var(--text-2);

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
        font-size: var(--font-size-5);
        .flex-row {
            width: 90%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            gap: calc(var(--settings-space) / 2);
            overflow: scroll;
        }
        .tile-row {
            align-items: flex-start;
            justify-content: start;
            flex-direction: column;
        }

        .table {
            width: 100%;
            height: fit-content;
            background-color: var(--bg-ac-1);
            border-radius: var(--border-radius);
            padding: var(--settings-space);

            border-collapse: separate;
            border-spacing: var(--settings-space) calc(var(--settings-space) / 2);

            tbody {
                tr {
                    th {
                        font-weight:normal;
                    }
                }
            }
        }
    }
}

@media (max-width: 600px) {
    .flex-row {
        flex-direction: column;
        gap: calc(var(--settings-space) / 2);
    }

    .table {
        display: block;
        padding: calc(var(--settings-space) / 2);
        border-radius: var(--border-radius);
    }

    .table thead {
        display: none;
    }

    .table tbody tr {
        display: block;
        margin-bottom: var(--settings-space);
        padding-bottom: var(--settings-space);
        border-bottom: 1px solid var(--key-1);
    }

    .table tbody td {
        display: flex;
        justify-content: space-between;
        padding: calc(var(--space) / 4) 0;
        align-items: center;
    }

    .table tbody td:before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--text-2);
        margin-right: var(--space-1);
        flex: 1;
        text-align: left;
    }

    .table tbody td > * {
        flex: 2;
        text-align: right;
    }

    input, select, button, .custom-select {
        width: 90% !important;
        max-width: none;
    }

    button {
        max-width: none;
        width: 100%;
        margin: 0.5rem 0;
    }

    .tile-column, .tile-row {
        width: 100%;
    }

    .width-70 {
        min-width: 90%;
        max-width: 90%;
    }

    .loading-gif-container-settings {
        justify-content: flex-end;
    }
}
</style>