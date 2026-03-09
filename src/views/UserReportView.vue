<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: t('profile.profile') })
})
import { ReportApi } from '@/stores/api/report.ts'

const reports = ReportApi.getReportsForUser()
const items = Array.from({ length: 1 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
}))
</script>

<template>
  <PageLayout>
    <UScrollArea v-slot="{ item, index }" :items="items" class="w-full h-96">
      <UPageCard
        v-bind="item"
        :variant="index % 2 === 0 ? 'soft' : 'outline'"
        class="rounded-none"
      />
    </UScrollArea>
  </PageLayout>
</template>
