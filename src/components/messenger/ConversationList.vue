<script setup lang="ts">
import { useRoute } from 'vue-router'
import ConversationItem from './ConversationItem.vue'

const route = useRoute()

const conversations = [
  { id: '1', name: 'John Doe', avatar: null, lastMessage: 'See you at the gym!', timestamp: '2m ago', unread: 2, isGroup: false },
  { id: '2', name: 'Fitness Group', avatar: null, lastMessage: 'Workout starts at 6pm', timestamp: '1h ago', unread: 0, isGroup: true },
  { id: '3', name: 'Sarah Miller', avatar: null, lastMessage: 'How was your run?', timestamp: '3h ago', unread: 1, isGroup: false },
  { id: '4', name: 'Morning Runners', avatar: null, lastMessage: 'Route changed for tomorrow', timestamp: 'Yesterday', unread: 0, isGroup: true },
  { id: '5', name: 'Alex Chen', avatar: null, lastMessage: 'Thanks for the tips!', timestamp: 'Yesterday', unread: 0, isGroup: false },
]
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <ConversationItem
      v-for="convo in conversations"
      :key="convo.id"
      v-bind="convo"
      :active="route.params.id === convo.id"
    />
  </div>
</template>
