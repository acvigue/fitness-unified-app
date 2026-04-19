<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import TeamPickerModal from '@/components/team-block/TeamPickerModal.vue'
import { useTeamChatStore } from '@/stores/teamChat'
import type { components } from '@/types/api'

type Team = components['schemas']['TeamResponseDto']

const props = defineProps<{
  fromTeamId: string
  excludeTeamIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'error', message: string): void
}>()

const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const teamChatStore = useTeamChatStore()
const creating = ref(false)

async function handleSelect(target: Team) {
  if (creating.value) return
  creating.value = true
  try {
    const chat = await teamChatStore.createOrGet(props.fromTeamId, target.id)
    open.value = false
    router.push(`/teams/${props.fromTeamId}/chats/${chat.id}`)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to open team chat'
    const blocked = /block/i.test(message)
    emit(
      'error',
      blocked ? 'One of the teams has blocked the other, so messaging is disabled.' : message,
    )
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <TeamPickerModal
    v-model:open="open"
    title="Message a Team"
    confirm-label="Message"
    :exclude-team-ids="[fromTeamId, ...(excludeTeamIds ?? [])]"
    @select="handleSelect"
  />
</template>
