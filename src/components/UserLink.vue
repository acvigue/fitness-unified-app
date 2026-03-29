<script lang="ts">
// Module-level cache shared across all UserLink instances
const profileCache = new Map<string, Promise<string>>()
</script>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/lib/api/client'

const props = defineProps<{
  userId: string
}>()

const name = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  if (!profileCache.has(props.userId)) {
    profileCache.set(
      props.userId,
      apiClient.GET('/v1/users/{userId}/profile', {
        params: { path: { userId: props.userId } },
      }).then(
        ({ data }) => {
          const d = data as any
          if (d?.firstName || d?.lastName) return [d.firstName, d.lastName].filter(Boolean).join(' ')
          return d?.name || d?.username || props.userId
        },
        () => props.userId,
      ),
    )
  }
  name.value = await profileCache.get(props.userId)!
  loading.value = false
})
</script>

<template>
  <RouterLink
    :to="`/profile/${userId}`"
    class="text-primary hover:underline truncate"
    @click.stop
  >
    <template v-if="loading">
      <span class="inline-block w-20 h-4 rounded bg-white/10 animate-pulse align-middle" />
    </template>
    <template v-else>{{ name }}</template>
  </RouterLink>
</template>
