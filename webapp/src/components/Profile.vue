<script setup lang="ts">
import { apiFetch } from '../composables/useApi';
const emit = defineEmits(["openProfile", "logout"]);

function handleCloseProfile() {
    emit("openProfile");
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

async function handleDeleteAccount() {
    const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmed) {
        return;
    }

    const deleteRes = await apiFetch('/api/user/delete', {
        method: 'POST',
        headers: {
            "Content-Type":"application/json"
        }
    });

    if (!deleteRes.ok) {
        window.alert("Failed to delete account. Please try again.");
        return;
    }

    await apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            "Content-Type":"application/json"
        }
    });

    window.alert("Your account has been deleted.");
    emit("logout");
    emit("openProfile");
}
</script>
<template>
    <div id="profile-menu">
        <button v-on:click="handleCloseProfile">x</button>
        <button v-on:click="handleLogout">Logout</button>
        <button id="delete-account-btn" v-on:click="handleDeleteAccount">Delete account</button>
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

    display: flex;
    flex-direction: column;
    gap: var(--space);
}

#delete-account-btn {
    background-color: var(--color-error-bg);
    color: var(--color-error);
}

</style>
