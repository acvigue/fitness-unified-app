<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGuideStore } from '@/stores/guide'

const guide = useGuideStore()

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8
const GAP = 16
const MARGIN = 16

const targetRect = ref<Rect | null>(null)
const tooltipEl = ref<HTMLElement | null>(null)
const tooltipPos = ref<{ top: number; left: number; placement: 'top' | 'bottom' | 'center' }>({
  top: 0,
  left: 0,
  placement: 'center',
})

const stepNumber = computed(() => guide.stepIndex + 1)
const stepTotal = computed(() => guide.steps.length)

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function findTarget(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector))
  return els.find(isVisible) ?? null
}

async function recompute() {
  await nextTick()
  const step = guide.currentStep
  if (!step) {
    targetRect.value = null
    positionTooltip()
    return
  }

  if (step.target) {
    const el = findTarget(step.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      const offscreen =
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      if (offscreen) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
        await new Promise((r) => setTimeout(r, 220))
      }
      const final = el.getBoundingClientRect()
      targetRect.value = {
        top: final.top - PADDING,
        left: final.left - PADDING,
        width: final.width + PADDING * 2,
        height: final.height + PADDING * 2,
      }
    } else {
      targetRect.value = null
    }
  } else {
    targetRect.value = null
  }

  await nextTick()
  positionTooltip()
}

function positionTooltip() {
  const tooltip = tooltipEl.value
  if (!tooltip) return
  const tw = tooltip.offsetWidth
  const th = tooltip.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  const rect = targetRect.value
  if (!rect) {
    tooltipPos.value = {
      top: Math.max(MARGIN, vh / 2 - th / 2),
      left: Math.max(MARGIN, vw / 2 - tw / 2),
      placement: 'center',
    }
    return
  }

  const spaceBelow = vh - (rect.top + rect.height) - GAP - MARGIN
  const spaceAbove = rect.top - GAP - MARGIN
  const placement: 'top' | 'bottom' =
    spaceBelow >= th ? 'bottom' : spaceAbove >= th ? 'top' : spaceBelow > spaceAbove ? 'bottom' : 'top'

  const top =
    placement === 'bottom' ? rect.top + rect.height + GAP : rect.top - GAP - th
  let left = rect.left + rect.width / 2 - tw / 2

  left = Math.max(MARGIN, Math.min(left, vw - tw - MARGIN))
  const clampedTop = Math.max(MARGIN, Math.min(top, vh - th - MARGIN))

  tooltipPos.value = { top: clampedTop, left, placement }
}

let scrollRaf = 0
function onScroll() {
  if (!guide.active) return
  if (scrollRaf) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0
    recompute()
  })
}

function onResize() {
  if (guide.active) recompute()
}

function onKeydown(e: KeyboardEvent) {
  if (!guide.active) return
  if (e.key === 'Escape') {
    e.preventDefault()
    guide.stop()
  } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.preventDefault()
    guide.next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    guide.prev()
  }
}

watch(
  () => [guide.active, guide.stepIndex],
  () => {
    if (guide.active) recompute()
  },
)

onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
  window.removeEventListener('scroll', onScroll, true)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="guide.active"
      class="fixed inset-0 z-1000"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="guide.currentStep ? `guide-title-${guide.currentStep.id}` : undefined"
    >
      <!-- Backdrop: full overlay when no target, otherwise box-shadow spotlight -->
      <div
        v-if="!targetRect"
        class="absolute inset-0 bg-black/70 backdrop-blur-[1px]"
        aria-hidden="true"
      />
      <div
        v-else
        class="absolute rounded-xl pointer-events-none transition-[top,left,width,height] duration-200 ease-out"
        :style="{
          top: `${targetRect.top}px`,
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
        }"
        aria-hidden="true"
      >
        <div
          class="absolute inset-0 rounded-xl ring-2 ring-primary-500 animate-pulse"
        />
      </div>

      <!-- Tooltip card -->
      <div
        ref="tooltipEl"
        class="absolute w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-md shadow-2xl p-4 transition-[top,left] duration-200 ease-out"
        :style="{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left}px` }"
      >
        <div class="flex items-start justify-between gap-3">
          <h3
            v-if="guide.currentStep?.title"
            :id="`guide-title-${guide.currentStep.id}`"
            class="text-base font-semibold text-white"
          >
            {{ guide.currentStep.title }}
          </h3>
          <span v-else />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            aria-label="Close guide"
            class="-mt-1 -mr-1"
            @click="guide.stop"
          />
        </div>

        <p
          v-if="guide.currentStep"
          class="text-sm text-white/80 leading-relaxed mt-2"
        >
          {{ guide.currentStep.body }}
        </p>

        <div class="flex items-center justify-between gap-2 mt-4">
          <div class="flex items-center gap-1.5" aria-hidden="true">
            <span
              v-for="(_, i) in guide.steps"
              :key="i"
              class="size-1.5 rounded-full transition-colors"
              :class="i === guide.stepIndex ? 'bg-primary-500' : 'bg-white/20'"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-white/40 mr-1">{{ stepNumber }} / {{ stepTotal }}</span>
            <UButton
              v-if="!guide.isFirst"
              size="sm"
              variant="ghost"
              color="neutral"
              @click="guide.prev"
            >
              Back
            </UButton>
            <UButton size="sm" color="primary" @click="guide.next">
              {{ guide.isLast ? 'Done' : 'Next' }}
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
