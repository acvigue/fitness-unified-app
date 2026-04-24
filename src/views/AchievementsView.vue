<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHead } from '@unhead/vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'
import type { components } from '@/types/api'

type UserAchievement = components['schemas']['UserAchievementResponseDto']
type AchievementDefinition = components['schemas']['AchievementDefinitionResponseDto']

useHead({ title: 'Achievements' })

const { setHeader } = usePageHeader()

const achievements = ref<UserAchievement[]>([])
const definitions = ref<AchievementDefinition[]>([])
const loading = ref(true)
const error = ref('')

const earned = computed(() => achievements.value.filter((a) => a.unlockedAt))

const inProgress = computed(() => achievements.value.filter((a) => !a.unlockedAt && a.progress > 0))

const locked = computed(() => achievements.value.filter((a) => !a.unlockedAt && a.progress === 0))

const totalCount = computed(() => definitions.value.length || achievements.value.length)

const CRITERIA_ICONS: Record<string, string> = {
  TOURNAMENT_PARTICIPATION: 'i-lucide-trophy',
  TOURNAMENT_MATCH_WIN: 'i-lucide-swords',
  TOURNAMENT_WIN: 'i-lucide-crown',
}

function getIcon(criteriaType: string) {
  return CRITERIA_ICONS[criteriaType] || 'i-lucide-award'
}

function progressPercent(achievement: UserAchievement) {
  const threshold = achievement.achievement.threshold
  if (threshold <= 0) return 100
  return Math.min((achievement.progress / threshold) * 100, 100)
}

function formatDate(dateStr: string | null | undefined | Record<string, never>) {
  if (!dateStr || typeof dateStr !== 'string') return ''
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [meResult, defsResult] = await Promise.all([
      apiClient.GET('/v1/achievements/me'),
      apiClient.GET('/v1/achievements/definitions'),
    ])
    if (meResult.error) {
      error.value = getErrorMessage(meResult.error, 'Failed to load achievements')
      return
    }
    achievements.value = meResult.data ?? []
    definitions.value = defsResult.data ?? []
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load achievements'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setHeader({ title: 'Achievements' })
  loadData()
})
</script>

<template>
  <PageLayout>
    <div v-if="loading" class="flex flex-col gap-3 px-5 py-6">
      <div class="h-20 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="i in 6"
          :key="i"
          class="h-24 rounded-lg border border-white/10 bg-white/5 animate-pulse"
        />
      </div>
    </div>

    <div v-else-if="error" class="p-5">
      <UAlert color="error" :title="error" icon="i-lucide-circle-alert" />
    </div>

    <section v-else class="flex flex-col gap-6 px-5 py-6">
      <!-- Summary -->
      <UCard class="bg-white/5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-white/60">Achievements</p>
            <p class="text-lg font-medium">{{ earned.length }} / {{ totalCount }} Unlocked</p>
          </div>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-lucide-refresh-cw"
            :loading="loading"
            aria-label="Refresh achievements"
            @click="loadData"
          />
        </div>
      </UCard>

      <!-- Earned -->
      <div v-if="earned.length > 0">
        <p class="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Earned</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="ua in earned"
            :key="ua.id ?? ua.achievement.id"
            class="rounded-lg border border-primary/30 bg-primary/5 p-4"
          >
            <div class="flex items-start gap-3">
              <div class="rounded-full bg-primary/20 p-2.5">
                <UIcon :name="getIcon(ua.achievement.criteriaType)" class="text-primary text-lg" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">{{ ua.achievement.name }}</p>
                <p class="text-xs text-white/60 mt-0.5">{{ ua.achievement.description }}</p>
                <p class="text-xs text-primary/80 mt-1">
                  Unlocked {{ formatDate(ua.unlockedAt as any) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- In Progress -->
      <div v-if="inProgress.length > 0">
        <p class="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">In Progress</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="ua in inProgress"
            :key="ua.id ?? ua.achievement.id"
            class="rounded-lg border border-white/10 bg-white/2 p-4"
          >
            <div class="flex items-start gap-3">
              <div class="rounded-full bg-white/10 p-2.5">
                <UIcon :name="getIcon(ua.achievement.criteriaType)" class="text-white/50 text-lg" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">{{ ua.achievement.name }}</p>
                <p class="text-xs text-white/60 mt-0.5">{{ ua.achievement.description }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-primary/50 transition-all"
                      :style="{ width: `${progressPercent(ua)}%` }"
                    />
                  </div>
                  <span class="text-[10px] text-white/40 whitespace-nowrap">
                    {{ ua.progress }}/{{ ua.achievement.threshold }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Locked -->
      <div v-if="locked.length > 0">
        <p class="text-xs uppercase tracking-[0.3em] text-white/60 mb-3">Locked</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="ua in locked"
            :key="ua.achievement.id"
            class="rounded-lg border border-white/5 bg-white/1 p-4 opacity-60"
          >
            <div class="flex items-start gap-3">
              <div class="rounded-full bg-white/5 p-2.5">
                <UIcon :name="getIcon(ua.achievement.criteriaType)" class="text-white/30 text-lg" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-white/70">{{ ua.achievement.name }}</p>
                <p class="text-xs text-white/40 mt-0.5">{{ ua.achievement.description }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden" />
                  <span class="text-[10px] text-white/30 whitespace-nowrap">
                    0/{{ ua.achievement.threshold }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="totalCount === 0"
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-white/10 p-8 text-center text-sm text-white/50"
      >
        <UIcon name="i-lucide-award" class="size-8 text-white/40" />
        <p>Complete workouts to earn your first achievement</p>
      </div>
    </section>
  </PageLayout>
</template>
