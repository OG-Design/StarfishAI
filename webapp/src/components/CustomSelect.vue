<script setup lang="ts">

import { ref, watch } from 'vue';
import { type CustomSelectType } from '../types/CustomSelectType';


const props = withDefaults(defineProps<{
  direction?: any | null,
  values: CustomSelectType[],
  currentSelection: CustomSelectType,
  updateHandler: (selected: CustomSelectType) => void
}>(), {
  direction: 'down',
});

const isRendered = ref<boolean>(false);

function handleChange(val: string) {
  if (!props.values || !props.values.length) return;
  const selectedObj = props.values.find(v => v.value === val);
  if (selectedObj) props.updateHandler(selectedObj);
  handleRenderOptions();
}

function handleRenderOptions() {
  isRendered.value = !isRendered.value;
}

// Debug: log props on mount
watch(() => props.values, (newVal) => {
  console.log('CustomSelect values changed:', newVal);
});
watch(() => props.currentSelection, (newVal) => {
  console.log('CustomSelect currentSelection changed:', newVal);
});

</script>
<template>
    <div id="selector" v-if="direction === 'down'">
      <button class="selection" @click="handleRenderOptions">
        {{ props.currentSelection.key }} ^
      </button>
      <section class="selectable-column" :style="{display: isRendered ? 'flex' : 'none'}">
        <button v-for="(value, index) in props.values" :key="index" :value="value.value" @click="handleChange(value.value)">{{ value.key }}</button>
      </section>
    </div>
    <div id="selector-row" v-else-if="direction === 'right'">
      <section class="selectable-column" :style="{display: isRendered ? 'flex' : 'none'}">
        <button v-for="(value, index) in props.values" :key="index" :value="value.value" @click="handleChange(value.value)">{{ value.key }}</button>
      </section>
      <button class="selection" @click="handleRenderOptions">
        {{ props.currentSelection.key }} ^
      </button>
    </div>
    <div id="selector" v-else>
      <section class="selectable-column" :style="{display: isRendered ? 'flex' : 'none'}">
        <button v-for="(value, index) in props.values" :key="index" :value="value.value" @click="handleChange(value.value)">{{ value.key }}</button>
      </section>
      <button class="selection" @click="handleRenderOptions">
        {{ props.currentSelection.key }} ^
      </button>
    </div>
</template>
<style lang="scss" scoped>

#selector {

  width: 200px;
  bottom: 20%;
  padding-left: calc(var(--space) * 2);

  display: flex;
  flex-direction: column;
  gap: var(--space-2);

}

#selector-row {

  width: fit-content;
  bottom: 20%;
  padding-left: calc(var(--space) * 2);

  display: flex;
  flex-direction: row-reverse;
  gap: var(--space-2);

  .selection {
    width: 100%;
  }

}

.selectable-column {
  height: fit-content;
  max-height: 200px;
  min-width: min(200px, 100%);
  width: min(200px, 100%);

  overflow-y: scroll;

  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: start;

  gap: var(--space-2);


  font-size: 24px;


  background-color: transparent;
  border: solid 1px hsla(237, 100%, 70%, .2);
  border-radius: $border-radius;

  background-color: $bg-alpha-1;
  color: $text-1;

  backdrop-filter: blur(8px);

  transition: .2s;

  &:hover {
    border-color: var(--key-1);
  }

  button {

      width: 100%;
      max-height: 32px;

      white-space: nowrap;
      overflow-y: scroll;
      scrollbar-width: none;

      border: none;
      border-top: 1px solid;
      border-bottom: 1px solid;
      border-color: hsla(237, 100%, 100%, 0);
      background-color: hsla(237, 100%, 100%, 0);

      font-size: 24px;
      &:hover {
        border-color: var(--key-1);
        background-color: hsla(237, 100%, 100%, .1);
      }
  }

}

.selection {
  height: 100%;
  min-width: 0;
  width: min(200px, 100%);

  font-size: 24px;

  white-space: nowrap;
  overflow-y: scroll;
  scrollbar-width: none;

  background-color: transparent;
  border: solid 1px hsla(237, 100%, 70%, .2);
  border-radius: $border-radius;

  background-color: $bg-alpha-1;
  color: $text-1;

  backdrop-filter: blur(8px);

  transition: .2s;

  &:hover {
    border-color: var(--key-1);
  }

}


</style>