<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { ReportApi } from '@/stores/api/report.ts'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
const { t } = useI18n()
const value = ref('')
const value2 = ref('')
const { setHeader } = usePageHeader()
const showAlert = ref(false)
const showSuccess = ref(false)

onMounted(() => {
  setHeader({ title: t('report.report') })
})

const SubmitReport = async () => {
  try {
    await ReportApi.sumbitReport(value.value, value2.value)
    showAlert.value = false
    showSuccess.value = true
  } catch (error) {
    showAlert.value = true
    showSuccess.value = false
  }
}
</script>

<template>
  <PageLayout>
    <UAlert description="User Not Found" v-if="showAlert" />
    <UAlert description="Report Successfully Sent" v-if="showSuccess" />
    <section class="flex flex-col gap-6 px-5 py-6">
      Which User Are You Reporting?
      <UInput v-model="value" />
      What is your reason for reporting them?
      <UTextarea v-model="value2"></UTextarea>
      <UButton @click="SubmitReport">Submit Report</UButton>
    </section>
  </PageLayout>
</template>
