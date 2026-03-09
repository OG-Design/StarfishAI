<script setup lang="ts">
import { apiFetch, apiBase, setApiBase, resetApiBase } from '../composables/useApi';
const emit = defineEmits(["openProfile", "logout"]);

function handleCloseProfile() {
    emit("openProfile");
}

function handleSaveApi() {
    setApiBase(apiBase.value);
    // Changing server means old session is invalid — force re-login
    emit("logout");
}

function handleReset() {
    resetApiBase();
    emit("logout");
}

async function handleLogout() {
    const res = await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            "Content-Type":"application/json"
        }
    });

    if (res.ok) {
        emit("logout");
        emit("openProfile");
    }
}
</script>
<template>
    <div id="profile-menu">
        <button v-on:click="handleCloseProfile">x</button>
        <span>Remote Connection Profile</span>
        <label for="url">Starfish API Address</label>
        <input id="url" type="text" placeholder="http://example.com" v-model="apiBase">
        <button v-on:click="handleSaveApi">Save</button>
        <button v-on:click="handleReset">Reset</button>
        <button v-on:click="handleLogout">Logout</button>

    </div>
</template>
<style lang="scss" scoped>

#profile-menu {
    width: 250px;
    height: fit-content;
    padding: var(--space);

    position: absolute;
    right: 0;
    top: $top-menu-height;

    border: 2px solid var(--key-2);
    border-radius: var(--border-radius);

    background-color: var(--bg-1);

    z-index: +100;
}

</style>