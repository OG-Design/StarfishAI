<script setup lang="ts">

import { onMounted, ref} from 'vue';


const win: any = window;
const ollamaIsRunning = ref<boolean>(false);
const isClosed = ref<boolean>(false);
console.log("win___", win);
console.log("win.electronAPI", win.electronAPI);

onMounted(() => {
    if (!win.electronAPI || typeof win.electronAPI.onElectronData !== 'function') {
        console.warn('electronAPI or onElectronData not available');
        return;
    }
    win.electronAPI.onElectronData((data: any) => {
        console.log("electronAPI event received", data);
        if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0].name === 'string') {
            if (data[0].name === 'ollama') {
                ollamaIsRunning.value = true;
            } else {
                ollamaIsRunning.value = false;
            }
        } else {
            ollamaIsRunning.value = false;
            console.warn('electronAPI event: unexpected data format', data);
        }
    });
});

function closeMessage() {
    console.log("closing ElectronMessage")
    isClosed.value=!isClosed.value;
    console.log(isClosed.value)
}

</script>
<template>

    <div v-if="!ollamaIsRunning">
        <div class="msg" v-if="!isClosed">
            <span>
            Ollama is not running, local app won't work! Connect to an external Starfish API in settings.
            </span>
            <button @click="closeMessage">Close</button>
        </div>
    </div>

</template>
<style lang="scss" scoped>
.msg {

    $width:200px;
    $height: 200px;

    width: $width;
    height: $height;
    position: absolute;
    z-index: +102;

    top: calc(50% - ($height + var(--space)) / 2);

    margin-left: calc(50vw - ($width + var(--space)) / 2);

    font-size: 24px;

    padding: var(--space);

    background-color: transparent;
    border: solid 1px var(--border-1);
    border-radius: var(--border-radius);

    background-color: var(--bg-alpha-2);

    backdrop-filter: blur(8px);

    transition: .2s;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &:hover {
      border-color: var(--key-2-solid);
    }


}
</style>