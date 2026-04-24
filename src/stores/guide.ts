import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useGuideRefsStore = defineStore('guiderefsstore', () => {
  const sidebar = ref<HTMLElement | null>(null)

  function setSidebar(el: HTMLElement | null) {
    sidebar.value = el
  }

  const getSidebar = computed(() => sidebar.value)

  return { sidebar, setSidebar, getSidebar }
})
