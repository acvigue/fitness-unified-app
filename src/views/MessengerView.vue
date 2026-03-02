<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: 'Messenger' })
})
</script>

<template>
  <PageLayout>
    <div class="flex flex-1 items-center justify-center text-white/50">
      <p>Coming soon</p>
    </div>
  </PageLayout>
</template>
