<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: t('report.report') })
})
</script>

<template>
  <PageLayout>
    <div class="flex flex-1 items-center justify-center text-white/50">
      <div>
        <label id="reportedUser">{{t('report.whichuser')}}<input type="text" id="reportedUserInput"></label><br>
        <label id="reportreasonLabel">{{t('report.whyreporting')}}</label><br>
        <textarea id="reasonInput"></textarea><br>
        <button id="reportSubmitButton">{{t('report.submit')}}</button>
      </div>
      <div>
        <label id="reportReporterLabel">{{t('report.reporter')}}:Reporter User's Name</label><br>
        <label id="reportReportedLabel">{{t('report.reporteduser')}}: Reported User's Name</label><br>
        <label id="reportReason">{{t('report.reason')}}: Reason of Report </label><br>
        <label id="reportCreatedTime">TimeOfReportCreation: 1/1/2000</label><br>
        <label id="reportResult">{{t('report.result')}}:<input id="reportResult"></label>
      </div>
    </div>
  </PageLayout>
</template>


