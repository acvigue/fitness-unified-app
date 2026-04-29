<script setup lang="ts">
import { computed } from 'vue'
import type { components } from '@/types/api'

type BracketRound = components['schemas']['BracketRoundDto']
type TournamentMatch = components['schemas']['TournamentMatchResponseDto']

const props = withDefaults(
  defineProps<{
    rounds: BracketRound[]
    totalRounds: number
    isOrgManager: boolean
    format?: 'SINGLE_ELIMINATION' | 'ROUND_ROBIN'
    /** Team IDs the viewer captains. Used to surface report/confirm/dispute. */
    myCaptainTeamIds?: string[]
  }>(),
  { myCaptainTeamIds: () => [] },
)

const emit = defineEmits<{
  recordResult: [match: TournamentMatch]
  reportResult: [match: TournamentMatch]
  confirmResult: [match: TournamentMatch]
  disputeResult: [match: TournamentMatch]
  forfeitMatch: [match: TournamentMatch]
}>()

function isCaptainOfTeam(teamId: string | null | undefined): boolean {
  return !!teamId && props.myCaptainTeamIds.includes(teamId)
}

function isMatchParticipant(match: TournamentMatch): boolean {
  return isCaptainOfTeam(match.team1?.id) || isCaptainOfTeam(match.team2?.id)
}

function getMatchStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'PENDING_CONFIRMATION':
      return 'info'
    case 'FORFEIT':
      return 'error'
    case 'BYE':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function getMatchStatusLabel(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'Completed'
    case 'PENDING':
      return 'Pending'
    case 'PENDING_CONFIRMATION':
      return 'Awaiting confirmation'
    case 'FORFEIT':
      return 'Forfeit'
    case 'BYE':
      return 'Bye'
    default:
      return status
  }
}

function canRecordResult(match: TournamentMatch): boolean {
  return (
    props.isOrgManager &&
    (match.status === 'PENDING' || match.status === 'PENDING_CONFIRMATION') &&
    !!match.team1 &&
    !!match.team2
  )
}

function canCaptainReport(match: TournamentMatch): boolean {
  return (
    isMatchParticipant(match) &&
    (match.status === 'PENDING' || match.status === 'PENDING_CONFIRMATION') &&
    !!match.team1 &&
    !!match.team2
  )
}

function canCaptainConfirm(match: TournamentMatch): boolean {
  if (match.status !== 'PENDING_CONFIRMATION') return false
  if (!match.reportedByTeamId) return false
  // Confirming captain must own a team in the match that didn't report.
  if (isCaptainOfTeam(match.team1?.id) && match.team1?.id !== match.reportedByTeamId) return true
  if (isCaptainOfTeam(match.team2?.id) && match.team2?.id !== match.reportedByTeamId) return true
  return false
}

function canForfeit(match: TournamentMatch): boolean {
  return (
    props.isOrgManager &&
    !['COMPLETED', 'BYE', 'FORFEIT'].includes(match.status) &&
    !!match.team1 &&
    !!match.team2
  )
}

const champion = computed(() => {
  if (props.format === 'ROUND_ROBIN') return null
  const finalRound = props.rounds[props.rounds.length - 1]
  if (!finalRound) return null
  const finalMatch = finalRound.matches[0]
  if (!finalMatch || finalMatch.status !== 'COMPLETED') return null
  return finalMatch.winner
})

function isDraw(match: TournamentMatch) {
  return match.status === 'COMPLETED' && !match.winner
}
</script>

<template>
  <!-- Champion Banner -->
  <div
    v-if="champion"
    class="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 mb-4 text-center"
  >
    <UIcon name="i-lucide-trophy" class="text-amber-400 size-6 mb-1" />
    <p class="text-xs uppercase tracking-[0.3em] text-amber-400/80">Champion</p>
    <p class="text-lg font-semibold text-amber-100">{{ champion.name }}</p>
  </div>

  <!-- Bracket Rounds -->
  <div
    role="region"
    aria-label="Tournament bracket"
    tabindex="0"
    class="flex gap-4 overflow-x-auto pb-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
  >
    <div
      v-for="round in rounds"
      :key="round.round"
      role="group"
      :aria-label="`${round.label} round`"
      class="flex flex-col gap-3 min-w-56 shrink-0"
    >
      <p class="text-xs uppercase tracking-[0.3em] text-white/60 text-center">
        {{ round.label }}
      </p>

      <div class="flex flex-col gap-3 justify-around flex-1">
        <div
          v-for="match in round.matches"
          :key="match.id"
          :aria-label="`Match ${match.matchNumber}: ${match.team1?.name ?? 'TBD'} vs ${match.team2?.name ?? 'TBD'}, status ${getMatchStatusLabel(match.status)}`"
          class="rounded-lg border border-white/10 overflow-hidden focus-within:ring-1 focus-within:ring-primary/40"
          :class="match.status === 'BYE' ? 'opacity-50' : ''"
        >
          <!-- Match header -->
          <div class="flex items-center justify-between px-3 py-1.5 bg-white/5">
            <span class="text-[10px] text-white/40 uppercase"> Match {{ match.matchNumber }} </span>
            <UBadge :color="getMatchStatusColor(match.status)" variant="soft" size="xs">
              {{ getMatchStatusLabel(match.status) }}
            </UBadge>
          </div>

          <!-- Team 1 -->
          <div
            class="flex items-center justify-between px-3 py-2 border-b border-white/5"
            :class="
              match.winner?.id === match.team1?.id
                ? 'bg-primary/10'
                : isDraw(match)
                  ? 'bg-white/3'
                  : ''
            "
          >
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                v-if="match.winner?.id === match.team1?.id"
                name="i-lucide-check"
                class="text-primary shrink-0 size-3.5"
              />
              <UIcon
                v-else-if="isDraw(match)"
                name="i-lucide-minus"
                class="text-white/40 shrink-0 size-3.5"
              />
              <span class="text-sm truncate" :class="match.team1 ? '' : 'text-white/30 italic'">
                {{ match.team1?.name || 'TBD' }}
              </span>
            </div>
            <span v-if="match.team1Score != null" class="text-sm font-mono font-medium ml-2">
              {{ match.team1Score }}
            </span>
          </div>

          <!-- Team 2 -->
          <div
            class="flex items-center justify-between px-3 py-2"
            :class="
              match.winner?.id === match.team2?.id
                ? 'bg-primary/10'
                : isDraw(match)
                  ? 'bg-white/3'
                  : ''
            "
          >
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                v-if="match.winner?.id === match.team2?.id"
                name="i-lucide-check"
                class="text-primary shrink-0 size-3.5"
              />
              <UIcon
                v-else-if="isDraw(match)"
                name="i-lucide-minus"
                class="text-white/40 shrink-0 size-3.5"
              />
              <span class="text-sm truncate" :class="match.team2 ? '' : 'text-white/30 italic'">
                {{ match.team2?.name || 'TBD' }}
              </span>
            </div>
            <span v-if="match.team2Score != null" class="text-sm font-mono font-medium ml-2">
              {{ match.team2Score }}
            </span>
          </div>

          <!-- Org-manager actions -->
          <div v-if="canRecordResult(match)" class="px-3 py-2 border-t border-white/5">
            <UButton
              size="xs"
              color="primary"
              variant="soft"
              block
              icon="i-lucide-pencil"
              @click="emit('recordResult', match)"
            >
              Record Result
            </UButton>
          </div>
          <div v-if="canForfeit(match)" class="px-3 pb-2">
            <UButton
              size="xs"
              color="error"
              variant="outline"
              block
              icon="i-lucide-flag"
              @click="emit('forfeitMatch', match)"
            >
              Record Forfeit
            </UButton>
          </div>

          <!-- Captain report (no current pending) -->
          <div
            v-if="canCaptainReport(match) && match.status === 'PENDING'"
            class="px-3 py-2 border-t border-white/5"
          >
            <UButton
              size="xs"
              variant="soft"
              block
              icon="i-lucide-pencil"
              @click="emit('reportResult', match)"
            >
              Report Score
            </UButton>
          </div>

          <!-- Captain confirm/dispute (other team reported) -->
          <div v-if="canCaptainConfirm(match)" class="px-3 py-2 border-t border-white/5 flex gap-2">
            <UButton
              size="xs"
              color="error"
              variant="outline"
              icon="i-lucide-x"
              class="flex-1"
              @click="emit('disputeResult', match)"
            >
              Dispute
            </UButton>
            <UButton
              size="xs"
              icon="i-lucide-check"
              class="flex-1"
              @click="emit('confirmResult', match)"
            >
              Confirm
            </UButton>
          </div>

          <!-- Reporting captain sees a pending indicator -->
          <div
            v-else-if="
              match.status === 'PENDING_CONFIRMATION' &&
              isMatchParticipant(match) &&
              isCaptainOfTeam(match.reportedByTeamId)
            "
            class="px-3 py-2 border-t border-white/5"
          >
            <p class="text-xs text-white/50 text-center">Awaiting opposing captain.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
