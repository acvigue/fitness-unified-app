import type {components} from "@/types/api";
import {chatApi} from "@/stores/api/chat.ts";
import {getErrorMessage} from "@/lib/api/errors.ts";
import {apiClient} from "@/lib/api/client.ts";

export type report = components['schemas']['ReportResponseDto']

export const ReportApi = {
   async sumbitReport(otherUser: string, givenReason: string): Promise<void>{
     let userId2 = null
     try {
        userId2 = await chatApi.lookupUsers(otherUser)
     } catch(error) {
        throw new Error(getErrorMessage(error, 'User not found'))
     }
     if (userId2.length === 0){
        throw new Error(getErrorMessage('User not found'))
     }
     const now = new Date();
     console.log(userId2)
     userId2 = userId2[0].id;
     console.log({reporterId: "1", reportedId: userId2, reason: givenReason,  status: "PENDING", createdAt: now.toDateString() })
     const { error} = await apiClient.POST('/v1/report', {
       body: {reporterId: "1", reportedId: userId2, reason: givenReason,  status: "PENDING", createdAt: now.toDateString() }
     })
     if (error) throw new Error(getErrorMessage(error, 'Failed to deactivate account'))
   },

   async getReportsForUser(): Promise<report> {
      const {data, error } = await apiClient.GET("/v1/report/user");
      if (error) throw new Error(getErrorMessage(error, 'Failed to deactivate account'))
      return data
   }
}
