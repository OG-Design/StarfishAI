<script setup>
import { nextTick, onMounted, ref } from 'vue';

import { apiFetch, apiBase } from '../composables/useApi';
import { nvidiaConfig, cpuConfig } from '../composables/useAiConfig';


const emit = defineEmits(["openSettings", "updateModels"]);

function handleSettingsMenu() {
    emit("openSettings");
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

const downloadPercentage = ref("");

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

const ollamaConfig = ref<Object>({

})

async function getOllamaConfig() {
    console.log("running getOllamaConfig()");
    const res = await apiFetch('/api/system/compose/ollama',{
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    });


    const data = await res.json();

    console.log("Response getOllamaConfig():", data);

}



getOllamaConfig();

const aiProccessorRef = ref();

async function handleAiProccessorChange() {
    console.log("running handleAiProccessorChange()");
    


    const val = aiProccessorRef.value;
    const body = {
        val
    };

    console.log("aiProccessorRef.value:", val);

    const res = await apiFetch('/api/system/compose/ollama',{
        method: 'POST',
        headers: {
            "Content-Type":"application/json"
        },
        body
    });


    const data = await res.json();

    console.log("Response handleAiProccessorChange():", data);
}


function toggleEditMode() {
    editMode_models.value = !editMode_models.value;
}

function deleteSelectedModels() {
    console.log("Deleting models: \n", selectedModels.value);
}


onMounted(async () => {
    nextTick();
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
                    <h3>AI Proccessor</h3>
                    <select v-model="aiProccessorRef">
                        <option :value="nvidiaConfig">
                            Nvidia GPU
                        </option>
                        <option :value="cpuConfig">
                            CPU
                        </option>
                    </select>
                    <button @click="handleAiProccessorChange">Apply</button>
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