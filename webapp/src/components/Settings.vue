<script setup>
import { defineEmits, nextTick, onMounted, ref } from 'vue';

const emit = defineEmits(["openSettings", "updateModels"]);

function handleSettingsMenu() {
    emit("openSettings");
}


const models = ref([]);
const groups = ref([]);
const selectedGroup = ref({});
const addName = ref("");
const addFullName = ref("");
const responseAddModel = ref("");
const editMode_models = ref(false);
const selectedModels = ref([]);

// fetch groups accessible by user (userGroup contains models)
async function fetchUserGroup() {
    const res = await fetch("/api/user/userGroup", {
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    })

    const groupsRes = await res.json();

    groups.value=groupsRes;

    selectedGroup.value = groupsRes[0];
    console.log("Selected group:", groupsRes[0]);

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

    const res = await fetch("/api/ai/model/all", {
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
    responseAddModel.value="Loading...";




    const body = {
        model: {
                name: addName.value,
                fullName: addFullName.value
            },
        group: {
            name: selectedGroup.value.name,
            idUserGroup: selectedGroup.value.userGroup_idUserGroup
        }
    }
    console.log("addModelToGroup, Body: \n", body);
    const res = await fetch('/api/ai/model/add', {
        method: 'POST',
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
    })
    const data = await res;


    while (!data) {
        for (let i in 3) {
            setInterval(responseAddModel.value="Loading","."*i, 1000)
        }
    }





    responseAddModel.value=data;
    console.log("Result of adding model:", await data);
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
                <button id="close-btn" @click="handleSettingsMenu">x</button></li>
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
                                <th><button @click="addModelToGroup">Add</button></th>
                                <th>{{ responseAddModel }}</th>
                            </tr>
                        </tbody>
                    </table>
                    <select v-model="selectedGroup" :key="selectedGroup" @change="fetchModelsByGroup">
                        <option v-for="(group, index) in groups" :value="group">{{group.name, group.userGroup_idUserGroup}}</option>
                    </select>
                </div>
            </li>
        </ul>
    </div>
</template>

<style lang="scss">
$space: 1rem;
$border-radius: 2rem;

h1 {
    font-size: 36px;
}

.fill {
    width: 100vw;
    height: 100vh;

    position: absolute;
    z-index: 100;

    padding: calc($space * 10);
    padding-left: calc($space * 25);
    padding-right: calc($space * 25);

    box-sizing: border-box;

    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
}
#settings-menu {
    width: 100%;

    height: 100%;

    background-color: #171A21;

    border-radius: $border-radius;
    border: 1px solid #8B5CF6;

    offset: 0;
    list-style: none;
    li {

        width: calc(100% - $space * 2);
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        padding: $space;
        box-sizing: border-box;

        gap: $space;

        border-radius: $border-radius;

        background-color: #222630;
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
        gap: $space;
    }
    select {
        width: 30%;
        height: fit-content;

        font-size: 18px;
        border-radius: $border-radius;
        border: 1px solid #8B5CF6;
    }
}

.table {
    width: 100%;
    max-width: 400px;
    height: fit-content;
    background-color: hsla(0, 0%, 85%, .2);
    border-radius: $border-radius;
    padding: $space;

    border-collapse: separate;
    border-spacing: $space calc($space / 2);

    tbody {
        tr {
            th {
                font-weight:normal;
            }
        }
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

}

@media screen and (max-width: 1500px) {
  .fill {
    padding: $space;
  }
}

@media screen and (max-height: 800px) {
  .fill {
    padding: $space;
  }
}
</style>