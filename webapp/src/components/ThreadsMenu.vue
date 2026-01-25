
<script setup lang="ts">


import { ref, onMounted, nextTick } from 'vue'

import type thread from '../../../types/thread';

const props = defineProps<{threadsAvailable: thread[]}>()

const emit = defineEmits(['openThread', 'updateThreadsAvailable']);

console.log(props.threadsAvailable);




function handleOpenThread(i: number) {
    console.log("Thread opening");

    const thread = props.threadsAvailable[i];

    if (!thread) {
        console.warn("No thread found at index ", i);
        return;
    }

    const title = thread.title; // title of selected thread
    const idThread = thread.idThread; // to reference the thread to find
    // console.log(title);

    emit('openThread', thread);
}

async function handleCreateThread () {
    console.log("Creating thread");
    const res = await fetch('/api/ai/thread/create');
    console.log(res);
    emit('updateThreadsAvailable');
}

let editMode = ref(false);

function handleEditMode() {
    console.log("Starting edit mode on threads, running:", self);

    console.log("editMode is",editMode);

    // display delete checkboxes and delete button
    editMode.value = !editMode.value;

}


// reference all inputs
const checkedIds = ref([]);

console.log("Reference:", checkedIds);


// Goes through each selected thread and deletes them
async function handleDeleteThreads() {
    console.log("Trying to delete threads:", checkedIds.value.map((thread) => {
        return thread;
    }));

    console.log(checkedIds.value.map(e=>e));

    const body = {
        threads: checkedIds.value.map(e=>e)
    }

    console.log(body);

    // confirm user choice
    if (confirm("Are you sure you want to delete the selected threads? This is irreversable! Click OK to delete or No to Cancel.")) {
        console.log("Threads are now deleted");

        const res = await fetch('/api/ai/thread/deleteSelected', {
            method: "POST",
            headers: {
                'Content-Type':'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log("Result of handleDeleteThreads: ", res);

    }

    // update threads
    emit("updateThreadsAvailable");

}

</script>

<template>
    <ul id="thread-menu">
        <!-- If editmode is not active -->
        <template v-if="!editMode">
            <button @click="handleEditMode">...</button>

            <!-- For each thread make button to open thread -->
            <li class="menu-child" v-for="(thr, index) in props.threadsAvailable" :key="index" >
                <button @click="handleOpenThread(index) /* handles thread opening */ ">{{thr.title}}</button>
            </li>
        </template>

        <!-- If editmode is active -->
        <template v-else>

            <div class="flex-row">
                <button @click="handleEditMode">...</button>
                <button class="delete-button" @click="handleDeleteThreads">Delete</button>
            </div>

            <!-- For each thread make button to open thread aswell as the delete checkbox -->
            <li class="menu-child" v-for="(thr, index) in props.threadsAvailable" :key="index" >
                <button
                @click="handleOpenThread(index) /* handles thread opening */ ">{{thr.title}}</button>
                <input type="checkbox"
                v-model="checkedIds"
                :value="thr.idThread"
                :key="index">
            </li>
        </template>
        <button @click="handleCreateThread">Create thread</button>
    </ul>
</template>


<style lang="scss" scoped>
$border-radius: 1rem;
$space: 1rem;

#thread-menu {
    // width: calc(12.5% - 2rem);

    // height: calc(100% - 2rem);
    margin: $space;

    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: center;
    gap: 1rem;

    offset: 0;

    padding: 0;
    padding-top: $space;
    
    overflow-x: scroll;

    border-radius: $border-radius;

    background-color: #171A21;

    grid-area: menu;
    overflow-y: hidden;


    button {
        width: calc(100% - $space * 2);
        box-sizing: border-box;
        border-radius: $border-radius;

        background-color: #1E2230;

    }

    .flex-row {

        width: 100%;

        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: start;

    }

    .menu-child {
        width: 100%;
        height: fit-content;

        display: flex;
        flex-direction: row;

        justify-content: space-around;
        align-items: center;
        padding: 0;
        margin: 0;

        input {
            margin: 0;
            width: 20%;
        }
    }

    .move {

        width: 100%;
        margin: 0;

        box-sizing: border-box;

        transition: width 1s;

    }

    .shrink {
        width: 80%;
    }

}
</style>

