import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface GuideStep {
  id: string
  title?: string
  body: string
  /**
   * CSS selector (or comma-separated list of selectors). The overlay picks the
   * first visible match — so cross-platform steps can supply both a desktop
   * and a mobile selector and the right one wins per breakpoint.
   * If omitted, the tooltip is centered on screen with no spotlight.
   */
  target?: string
  /**
   * Run before this step is shown. Use to open menus or scroll containers
   * so that the target is mounted before we measure it.
   */
  before?: () => void | Promise<void>
}

export const useGuideStore = defineStore('guide', () => {
  const active = ref(false)
  const stepIndex = ref(0)
  const steps = ref<GuideStep[]>([])

  const currentStep = computed<GuideStep | undefined>(() => steps.value[stepIndex.value])
  const isFirst = computed(() => stepIndex.value === 0)
  const isLast = computed(() => stepIndex.value >= steps.value.length - 1)

  async function start(newSteps: GuideStep[]) {
    if (newSteps.length === 0) return
    steps.value = newSteps
    stepIndex.value = 0
    active.value = true
    await runBefore()
  }

  async function next() {
    if (!active.value) return
    if (isLast.value) {
      stop()
      return
    }
    stepIndex.value += 1
    await runBefore()
  }

  async function prev() {
    if (!active.value || isFirst.value) return
    stepIndex.value -= 1
    await runBefore()
  }

  function stop() {
    active.value = false
    steps.value = []
    stepIndex.value = 0
  }

  async function runBefore() {
    const before = currentStep.value?.before
    if (before) await before()
  }

  return {
    active,
    stepIndex,
    steps,
    currentStep,
    isFirst,
    isLast,
    start,
    next,
    prev,
    stop,
  }
})
