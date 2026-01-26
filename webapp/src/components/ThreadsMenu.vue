
<script setup lang="ts">


import { ref, onMounted, nextTick } from 'vue'

import type thread from '../../../types/thread';

const props = defineProps<{threadsAvailable: thread[]}>()

const emit = defineEmits(['openThread', 'updateThreadsAvailable']);

console.log(props.threadsAvailable);


const selectedThread = ref(props.threadsAvailable[1]);

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

    selectedThread.value=idThread

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

            <div class="flex-row">
                <button @click="handleEditMode">...</button>
            </div>
            <!-- For each thread make button to open thread -->
            <li class="menu-child" v-for="(thr, index) in props.threadsAvailable" :key="index" >
                <button @click="handleOpenThread(index) /* handles thread opening */ " :class="{'selected-thread': selectedThread == thr.idThread}" >{{thr.title}}</button>
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
                @click="handleOpenThread(index) /* handles thread opening */ " :class="{'selected-thread': selectedThread == thr.idThread}">{{thr.title}}</button>
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

    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: center;
    gap: 1rem;

    offset: 0;

    padding: 0;
    padding-top: $space;

    margin-left: calc($space / 2);



    border-radius: $border-radius;

    background-color: #171A21;

    grid-area: menu;
    overflow-y: scroll;
    overflow-x: hidden;


    button {
        width: calc(100% - $space * 2);
        height: fit-content;

        padding: $space;

        box-sizing: border-box;
        border-radius: $border-radius;

        color: #A0A4B8;
        background-color: #1E2230;
        border: 1px solid #1E2230;

        transition: .2s;

        &:hover {
            border: 1px solid hsla(240, 100%, 74%, .4);
        }
    }

    .flex-row {

        width: calc(100% - $space);

        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: start;

        gap: $space;
        padding: $space;
        padding-bottom: 0;

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

    .selected-thread {
        color: #E6E8EE;
        border: 1px solid #7C7CFF;
    }

}
</style>

