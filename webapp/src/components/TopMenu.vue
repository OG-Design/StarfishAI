<script setup>
import { defineEmits } from 'vue';

const emit = defineEmits(["openSettings", "openProfile"]);

function handleOpenSettings() {
    console.log("Opening settings menu. \n Emitting signal to parent.");
    emit("openSettings");
}

function handleOpenProfile() {
    console.log("Opening profile menu. \n Emitting signal to parent.");
    emit("openProfile");
}

</script>
<template>
    <section id="controll-menu">
        <button id="settings-btn" @click="handleOpenSettings">Settings</button>
        <button id="profile-btn" @click="handleOpenProfile">Profile</button>
    </section>
</template>
<style lang="scss">

#controll-menu {
    width: 150px;
    height: fit-content;


    right: 0;
    position: absolute;

    z-index: 100;

    display: flex;

    padding: $space;
    gap: $space;


    button {
        $size: 50px;
        width: $size;
        height: $size;
        border-radius: 1000px;
    }

}

#settings-btn {
    background-color: #8b5cf6;
}

#profile-btn {
 background-color: #7c7cff;
}

</style>