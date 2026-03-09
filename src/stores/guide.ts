import { ref, computed, useTemplateRef } from 'vue'
import { defineStore } from 'pinia'

export const useGuideRefsStore = defineStore('guiderefsstore', () => {
  const sidebar = ref()
  function setSidebar(r) {
    sidebar.value = r
    console.log('setting thing:')
    console.log(r)
    console.log(sidebar.value)
  }
  const getSidebar = computed(() => sidebar.value)
  return { sidebar, setSidebar, getSidebar }
})
