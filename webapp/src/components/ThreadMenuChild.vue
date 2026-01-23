
<script setup lang="ts">
import { ref } from 'vue'


defineProps<{ title: string }>()


const count = ref(0);
</script>

<template>
<li>{{title}}</li>
</template>

