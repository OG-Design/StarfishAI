<script setup>
import { defineEmits } from 'vue';

const props = defineProps({
    username: {
        type: String,
        default: 'Profile'
    }
});

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
        <button id="profile-btn" @click="handleOpenProfile">{{ props.username || 'Profile' }}</button>
    </section>
</template>
<style lang="scss">

#controll-menu {
    width: 150px;
    height: $top-menu-height;


    right: 0;
    position: absolute;

    z-index: 100;

    display: flex;

    padding: var(--space);
    gap: var(--space);

    button {
        height: 50px;
        border-radius: 1000px;
        padding: 0 14px;
    }

}

#settings-btn {
    width: 50px;
    background-color: var(--key-1);
}

#profile-btn {
    min-width: 70px;
    max-width: 180px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background-color: var(--key-2-bright);
}

</style>