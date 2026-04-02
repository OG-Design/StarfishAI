<script lang="ts" setup>
import { ref } from 'vue';
import { useVoiceBrowser } from '../composables/useVoice';


const props = defineProps<{textContent: string}>()

const soundPlaying = ref(false); 

async function handlePlaySound() {
  if (soundPlaying.value === true) {
    // Stop speech synthesis if already playing
    window.speechSynthesis.cancel();
    soundPlaying.value = false;
    return;
  }

  console.log("Playing sound with content:", props.textContent);
  soundPlaying.value = true;
  try {
    await useVoiceBrowser(props.textContent);
  } finally {
    soundPlaying.value = false;
  }
}

</script>

<template>
    <button v-on:click="handlePlaySound" class="play-sound-button">{{soundPlaying ? "Stop" : "Play Sound"}}</button>
</template>

<style scoped>
.play-sound-button {
  margin-left: calc(70% + var(--space));
  transform: translateY(calc(-1 * var(--space) * 9));
}
</style>