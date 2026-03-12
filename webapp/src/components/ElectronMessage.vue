<script setup lang="ts">

import { onMounted, ref} from 'vue';


const win: any = window;
const ollamaIsRunning = ref<boolean>(false);

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



</script>
<template>

    <div v-if="!ollamaIsRunning">Ollama is not running, local app won't work!</div>

</template>
<style lang="scss" scoped>
div {
    width: 200px;
    height: 100px;
    position: absolute;
    z-index: +102;
    background-color: azure;
    color: black;
}
</style>