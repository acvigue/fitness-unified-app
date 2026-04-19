<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMeetupStore } from '@/stores/meetup'
import type { components } from '@/types/api'

type Meetup = components['schemas']['MeetupResponseDto']

const props = defineProps<{
  meetup: Meetup
  teamId: string
  isCaptain: boolean
}>()

const emit = defineEmits<{
  (e: 'error', message: string): void
  (e: 'success', message: string): void
}>()

const meetupStore = useMeetupStore()
const actionLoading = ref<'accept' | 'decline' | 'cancel' | null>(null)

const isIncoming = computed(() => props.meetup.receivingTeamId === props.teamId)
const otherTeamName = computed(() =>
  isIncoming.value ? props.meetup.proposingTeamName : props.meetup.receivingTeamName,
)

const descriptionText = computed(() => {
  const d = props.meetup.description as unknown
  return typeof d === 'string' && d.length ? d : null
})

const statusMeta = computed(() => {
  switch (props.meetup.status) {
    case 'PENDING':
      return { color: 'warning' as const, label: 'Pending' }
    case 'ACCEPTED':
      return { color: 'success' as const, label: 'Accepted' }
    case 'DECLINED':
      return { color: 'error' as const, label: 'Declined' }
    case 'CANCELLED':
      return { color: 'neutral' as const, label: 'Cancelled' }
  }
})

const canAccept = computed(
  () => props.isCaptain && isIncoming.value && props.meetup.status === 'PENDING',
)
const canCancel = computed(
  () =>
    props.isCaptain &&
    !isIncoming.value &&
    (props.meetup.status === 'PENDING' || props.meetup.status === 'ACCEPTED'),
)

const formattedDateTime = computed(() => {
  const d = new Date(props.meetup.dateTime)
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
})

async function act(action: 'accept' | 'decline' | 'cancel') {
  actionLoading.value = action
  try {
    await meetupStore[action](props.meetup.id)
    const verb = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled'
    emit('success', `Meetup ${verb}`)
  } catch (e) {
    emit('error', e instanceof Error ? e.message : `Failed to ${action}`)
  } finally {
    actionLoading.value = null
  }
}
</script>

<template>
  <UCard class="bg-white/5">
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-base font-medium truncate">{{ meetup.title }}</p>
            <UBadge :color="statusMeta.color" variant="soft" size="xs">
              {{ statusMeta.label }}
            </UBadge>
          </div>
          <p class="text-xs text-white/50 mt-0.5">
            {{ isIncoming ? 'From' : 'To' }} <span class="text-white/70">{{ otherTeamName }}</span>
          </p>
        </div>
      </div>

      <div class="flex flex-col gap-2 text-sm text-white/80">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-calendar" class="text-white/50 size-4 shrink-0" />
          <span>{{ formattedDateTime }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-map-pin" class="text-white/50 size-4 shrink-0" />
          <span class="truncate">{{ meetup.location }}</span>
        </div>
      </div>

      <p v-if="descriptionText" class="text-sm text-white/70 whitespace-pre-wrap">
        {{ descriptionText }}
      </p>

      <div v-if="canAccept || canCancel" class="flex flex-wrap gap-2 pt-1">
        <template v-if="canAccept">
          <UButton
            size="xs"
            color="primary"
            :loading="actionLoading === 'accept'"
            :disabled="!!actionLoading"
            @click="act('accept')"
          >
            Accept
          </UButton>
          <UButton
            size="xs"
            color="error"
            variant="soft"
            :loading="actionLoading === 'decline'"
            :disabled="!!actionLoading"
            @click="act('decline')"
          >
            Decline
          </UButton>
        </template>
        <UButton
          v-if="canCancel"
          size="xs"
          color="neutral"
          variant="soft"
          :loading="actionLoading === 'cancel'"
          :disabled="!!actionLoading"
          @click="act('cancel')"
        >
          Cancel
        </UButton>
      </div>
    </div>
  </UCard>
</template>
