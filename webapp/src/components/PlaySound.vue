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
    <button v-on:click="handlePlaySound" class="play-sound-button" :title="soundPlaying ? 'Stop' : 'Play sound'">
      <svg v-if="!soundPlaying" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
    </button>
</template>

<style scoped>
.play-sound-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted, #aaa);
  cursor: pointer;
  transition: color 0.15s, background 0.15s;

  &:hover {
    background: var(--bg-ac-1, #3a3a3a);
    color: var(--text-1, #fff);
  }
}
</style>