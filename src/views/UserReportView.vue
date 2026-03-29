<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
import type { components } from '@/types/api'
import { apiClient } from '@/lib/api/client'
import { getErrorMessage } from '@/lib/api/errors'

type Report = components['schemas']['ReportResponseDto']

const { t } = useI18n()
const { setHeader } = usePageHeader()
const reports = ref<Report[]>([])

onMounted(async () => {
  setHeader({ title: t('profile.profile') })

  const { data: reportsData, error: reportsError } = await apiClient.GET('/v1/report/user')
  if (reportsError) throw new Error(getErrorMessage(reportsError, 'Failed to load reports'))
  reports.value = Array.isArray(reportsData) ? reportsData : [reportsData]
})
const items = Array.from({ length: 1 }, (_, i) => ({
  id: i + 1,
  title: `Item ${i + 1}`,
}))

</script>

<template>
  <PageLayout>
    <UScrollArea
      v-slot="{ item, index }"
      :items="items"
      class="w-full h-96"
    >
      <UPageCard
        v-bind="item"
        :variant="index % 2 === 0 ? 'soft' : 'outline'"
        class="rounded-none"
      />
    </UScrollArea>
  </PageLayout>
</template>




