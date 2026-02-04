<script setup lang="ts">

import { connect } from 'socket.io-client';
import {ref, onMounted, watch} from 'vue'

// used to make a socket connection.
import { connectSocket } from '../composables/useSocket';

// define props
const props = defineProps({
    authenticated: Boolean
});


// Reference authenticated as props.authenticated to decide if login should show
let authenticated = ref(props.authenticated);

// login / register value store
let username = ref('');
let password = ref('');
let register_username = ref('');
let register_password = ref('');
let register_password_confirm = ref('');

const isRegisterable = ref(false);


// Emit signals out of this component as named in array elements
const emit = defineEmits(['updateThreadsAvailable', 'authenticated']);

// watch props.authenticated for change, on change: change authenticated value to val
watch(()=> props.authenticated,
    (val: any) => {
    authenticated.value = val;
});


onMounted(async () => {

    // check session
    async function checkSession() {
        const res = await fetch('/api/auth/check', {
            credentials: 'include'
        });

        const data = await res.json();

        console.log(data.isAuth);

        if (data) {
            // change local and global variable to data.isAuth
            authenticated.value = data.isAuth;
            emit('authenticated', data.isAuth);
            return;
        }

        // authenticated.value = data.isAuth;

        console.log("Session: ", await data);
    }

    checkSession();

    try {
        // Connect to the socket
        connectSocket();
    } catch (err) {
        console.error("Error connecting to socket:", err)
    }

    // check id the API user regiserability is active
    const checkRegisterability = await fetch("/api/user/isRegisterable");
    const res = await checkRegisterability.json();

    if (res.isRegisterable==undefined) {
        isRegisterable.value = false
    }

    // Assign isRegistarable the api's response value
    isRegisterable.value = res.isRegisterable;

});

// Handles login
async function handleLogin() {

    const body = {
        username: username.value,
        password: password.value
    }

    const res = await fetch('/api/auth/login', {
        method: "POST",
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body),
        credentials: 'include'
    });

    const data = await res.json();

    if (data.message == "Logged in successfully") {


        console.log("Logged in successfully")

        authenticated.value = true;

        // Emit value true for authenticated
        emit('authenticated', true);
        emit('updateThreadsAvailable')
        connectSocket(); //connect socket after login

        // Emit object doUpdate, makes the threadMenu update it's selection
        emit("updateThreadsAvailable", {doUpdate: true});
    }

}

// Handles registration
async function handleRegister() {

    const body = {
        username: register_username.value,
        password: register_password.value,
        password_confirm: register_password_confirm.value
    }

    console.log("Register body \n", body);

    const res = await fetch('/api/user/register', {
        method: "POST",
        headers: {
            'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.message == "Registered successfully") {

        console.log("Registered in successfully");

    }

}





</script>

<template>
    <!-- If not authenticated display login / register form -->
    <template v-if="!authenticated">
        <section id="login-register">
            <form id="login-form" @submit.prevent="handleLogin">
                <label for="username">Username</label>
                <input type="text" placeholder="username" v-model="username">
                <label for="password">Password</label>
                <input type="password" placeholder="******" v-model="password">
                <button type="submit">Sign in</button>
            </form>
            <!-- Check if isRegisterable, if it is then render -->
            <form v-if="isRegisterable" id="register-form" @submit.prevent="handleRegister">
                <label for="username">Username</label>
                <input type="text" placeholder="username" v-model="register_username">
                <label for="password">Password</label>
                <input type="password" placeholder="******" v-model="register_password">
                <label for="password">Password Confirmation</label>
                <input type="password" placeholder="******" v-model="register_password_confirm">

                <button type="submit">Sign in</button>
            </form>
        </section>
    </template>
    <template v-else>

    </template>

</template>


<style scoped>
#login-form {
}
#login-register {

    width: 500px;
    height: 150px;
    left: calc(50vw - 300px + 50px );

    top: 50vh;
    position: absolute;
    z-index: +100;
    background-color: #555;

    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: start;

    padding: 50px;
    gap: 5px;
}
</style>
