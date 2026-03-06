<script setup lang="ts">
import {ref, onMounted } from 'vue'
import PageLayout from '@/layouts/PageLayout.vue'
import { usePageHeader } from '@/composables/usePageHeader'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()


const { setHeader } = usePageHeader()

onMounted(() => {
  setHeader({ title: t('profile.profile') })
})
import { userApi } from "@/stores/api/user.ts";
import router from "@/router";

const data = await userApi.getProfile();
console.log(data)
let bio = ""
  if (data.bio === undefined){
    bio = "Bio: None Please Add one"
  }
  else {
    bio = JSON.stringify(data.bio)
  }
const moveToReportsPage = async () =>{
    router.push('/user/report');
}

</script>

<template>
  <PageLayout>
    <div class="flex flex-1 items-Left justify-center text-white/50">
      <img src="./icon.png" id="profile-picture" alt="bruh">
    </div>
    <div class="flex flex-1 items-Left justify-center text-white/50">
      <p>Name: </p><p></p><br>
    </div>
    <div class="flex flex-1 items-Left justify-center text-white/50">
      <p>Favorite Sport: </p><br>
    </div>
    <div class="flex flex-1 items-Left justify-center text-white/50" ref="bio">
      <p>Bio: {{JSON.stringify(data.bio)}}</p>
    </div>
    <div>
      <p>Tournaments: None Played In</p><br>
    </div>
    <div>
      <p>Achievements: None Earned</p>
    </div>
    <UButton @click="moveToReportsPage">MyReports</UButton>


  </PageLayout>
</template>




