<script setup lang="ts">
import { onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'

const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: 'Report' })
})
</script>

<template>
  <PageLayout>
    <div class="flex flex-1 items-center justify-center text-white/50">
      <div>
        <label id="reportedUser">Which User are you reporting?<input type="text" id="reportedUserInput"></label><br>
        <label id="reportreasonLabel">Why are you reporting this user?</label><br>
        <textarea id="reasonInput"></textarea><br>
        <button id="reportSubmitButton">Submit Report</button>
      </div>
      <div>
        <label id="reportReporterLabel">Reporter:Reporter User's Name</label><br>
        <label id="reportReportedLabel">Reported User: Reported User's Name</label><br>
        <label id="reportReason">Reason: Reason of Report </label><br>
        <label id="reportCreatedTime">TimeOfReportCreation: 1/1/2000</label><br>
        <label id="reportResult">Result:<input id="reportResult"></label>
      </div>
    </div>
  </PageLayout>
</template>


