<script setup>
import { defineEmits, ref } from 'vue';

const emit = defineEmits(["openSettings"]);

function handleSettingsMenu() {
    emit("openSettings");
}

async function fetchUserGroup() {
    const res = await fetch("/api/user/userGroup", {
        method: 'GET',
        headers: {
            "Content-Type":"application/json"
        }
    })

    groups.value=await res.json();

    console.log("UserGroups: \n", await groups.value);
}

fetchUserGroup();

const models = ref([]);
const groups = ref([]);
const selectedGroup = ref({});
async function fetchModelsByGroup() {

}

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
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="value in source"></tr>
                            <tr>
                                <th>llama3</th>
                                <th>llama3</th>
                                <th><div class="status-ready"></div></th>
                            </tr>

                        </tbody>
                    </table>
                    <select>
                        <option v-for="(group, index) in groups" :value="group.idUserGroup">{{group.name}}</option>
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
</style>