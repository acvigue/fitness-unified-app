<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import ConversationList from '@/components/messenger/ConversationList.vue'

const route = useRoute()

useHead({ title: 'Messenger' })

const hasChatSelected = computed(() => !!route.params.id)
</script>

<template>
  <div class="flex flex-row h-full">
    <!-- Conversation list panel -->
    <div
      class="flex flex-col h-full border-r border-white/10 overflow-hidden"
      :class="hasChatSelected ? 'hidden lg:flex lg:w-80 lg:shrink-0' : 'flex-1 lg:w-80 lg:shrink-0 lg:flex-initial'"
    >
      <!-- List header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h1 class="text-lg font-semibold">Messenger</h1>
        <UButton icon="i-fa6-solid:pen-to-square" variant="ghost" color="neutral" size="sm" square />
      </div>

      <ConversationList />
    </div>

    <!-- Chat panel (nested route or empty state) -->
    <div
      class="flex flex-col h-full min-w-0"
      :class="hasChatSelected ? 'flex-1' : 'hidden lg:flex lg:flex-1'"
    >
      <RouterView v-if="hasChatSelected" />

      <!-- Desktop empty state when no chat selected -->
      <div v-else class="flex flex-1 items-center justify-center text-white/30">
        <div class="text-center">
          <UIcon name="i-fa6-solid:comments" class="text-4xl mb-3" />
          <p class="text-sm">Select a conversation to start chatting</p>
        </div>
      </div>
    </div>
  </div>
</template>
