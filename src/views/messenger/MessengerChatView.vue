<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const route = useRoute()
const messageInput = ref('')

const placeholderText = ref(t('messenger.typemessage'))

const chatName = computed(() => {
  const names: Record<string, string> = {
    '1': 'John Doe',
    '2': 'Fitness Group',
    '3': 'Sarah Miller',
    '4': 'Morning Runners',
    '5': 'Alex Chen',
  }
  return names[route.params.id as string] ?? 'Chat'
})

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  parts: Array<{ type: 'text'; text: string }>
  sender?: string
}

function msg(id: string, role: 'user' | 'assistant', text: string, sender?: string): ChatMessage {
  return { id, role, parts: [{ type: 'text', text }], sender }
}

const isGroup = computed(() => ['2', '4'].includes(route.params.id as string))

const mockMessages = computed<ChatMessage[]>(() => {
  const id = route.params.id as string
  const messages: Record<string, ChatMessage[]> = {
    '1': [
      msg('1', 'assistant', "Hey! Long time no see. How's the new training program going?"),
      msg('2', 'user', "Pretty good actually! I've been hitting the gym 4 times a week."),
      msg('3', 'assistant', "That's awesome! What split are you running?"),
      msg('4', 'user', 'Upper/lower split. Monday and Thursday upper, Tuesday and Friday lower.'),
      msg('5', 'assistant', "Nice, that's solid. I switched to push/pull/legs recently."),
      msg('6', 'user', "How's that working for you?"),
      msg('7', 'assistant', 'Loving it so far. More volume per muscle group.'),
      msg('8', 'user', 'I might try that next month. Are you coming to the gym today?'),
      msg('9', 'assistant', 'Yeah for sure. Leg day today though 😅'),
      msg('10', 'user', 'Haha same here. Want to work in together on squats?'),
      msg('11', 'assistant', 'Absolutely! What time are you heading over?'),
      msg('12', 'user', "Yeah, I'll be there at 5!"),
      msg('13', 'assistant', "Perfect. I'll grab us a rack."),
      msg('14', 'user', 'Sounds good, see you then!'),
      msg('15', 'assistant', 'See you at the gym!'),
    ],
    '2': [
      msg(
        '1',
        'assistant',
        "Hey everyone! Just a heads up about this week's schedule.",
        'Mike Torres',
      ),
      msg('2', 'assistant', 'Tuesday and Thursday sessions are moved to 7pm.', 'Mike Torres'),
      msg('3', 'assistant', 'Works for me!', 'Lisa Park'),
      msg('4', 'user', 'Can we keep Tuesday at 6? I have a conflict at 7.'),
      msg('5', 'assistant', 'Let me check with the trainer. One sec.', 'Mike Torres'),
      msg('6', 'assistant', 'I also prefer 6pm if possible.', 'Chris Patel'),
      msg('7', 'assistant', 'Same here, 6 is better for me too.', 'Dana Lee'),
      msg(
        '8',
        'assistant',
        'Ok trainer says Tuesday can stay at 6, but Thursday has to be 7.',
        'Mike Torres',
      ),
      msg('9', 'user', 'That works! Thanks for checking.'),
      msg('10', 'assistant', 'Great, updated the calendar.', 'Mike Torres'),
      msg('11', 'assistant', 'Reminder: group workout session this evening', 'Mike Torres'),
      msg('12', 'user', 'What time does it start?'),
      msg('13', 'assistant', 'Workout starts at 6pm', 'Lisa Park'),
      msg('14', 'assistant', "Don't forget your water bottle!", 'Mike Torres'),
      msg('15', 'assistant', "And bring a towel, it's gonna be intense 💪", 'Lisa Park'),
    ],
    '3': [
      msg('1', 'assistant', 'Hey! Did you end up going for that run this morning?'),
      msg('2', 'user', 'Yes! Just finished a 5k!'),
      msg('3', 'assistant', 'How was your run?'),
      msg('4', 'user', 'Felt great honestly. Beat my PR by 30 seconds.'),
      msg('5', 'assistant', "No way, that's incredible! What was your time?"),
      msg('6', 'user', "22:45. I know it's not super fast but I'm happy with it."),
      msg('7', 'assistant', "Are you kidding? That's a great time! Especially for a morning run."),
      msg('8', 'user', 'Thanks! The cool weather definitely helped.'),
      msg(
        '9',
        'assistant',
        "We should do a run together sometime. I'm trying to get back into it.",
      ),
      msg('10', 'user', "I'd love that! Saturday mornings work best for me."),
      msg('11', 'assistant', "Saturday it is. There's a nice trail by the lake."),
      msg('12', 'user', 'Oh I know that one! Beautiful route.'),
      msg('13', 'assistant', "Perfect, let's plan for this Saturday then? 8am?"),
      msg('14', 'user', 'Done! See you there 🏃'),
    ],
    '4': [
      msg(
        '1',
        'assistant',
        "Good morning everyone! Quick update about tomorrow's route.",
        'Dana Lee',
      ),
      msg(
        '2',
        'assistant',
        'The usual path through the park is closed for construction.',
        'Dana Lee',
      ),
      msg('3', 'assistant', "Oh no, that's our best route! Any alternatives?", 'Chris Patel'),
      msg(
        '4',
        'assistant',
        'I scouted a new route yesterday. Goes along the river trail instead.',
        'Dana Lee',
      ),
      msg('5', 'user', 'How long is the river trail?'),
      msg('6', 'assistant', 'About 6km. Slightly longer but really scenic.', 'Dana Lee'),
      msg(
        '7',
        'assistant',
        "I've run that trail before, it's great! A bit hilly though.",
        'Chris Patel',
      ),
      msg('8', 'user', "Hills are good for training. I'm in!"),
      msg('9', 'assistant', 'Same here. Hills build character 😄', 'Chris Patel'),
      msg('10', 'assistant', 'Route changed for tomorrow — meet at the park entrance', 'Dana Lee'),
      msg('11', 'assistant', 'Got it, thanks!', 'Chris Patel'),
      msg('12', 'user', "I'll be there at 6am"),
      msg('13', 'assistant', 'See everyone bright and early! ☀️', 'Dana Lee'),
    ],
  }
  return messages[id] ?? [msg('1', 'assistant', 'Hey there!')]
})

function handleSubmit() {
  if (!messageInput.value.trim()) return
  messageInput.value = ''
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Chat header (visible on mobile as standalone, on desktop as panel header) -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
      <RouterLink
        to="/messenger"
        class="lg:hidden text-white/70 hover:text-white transition-colors"
      >
        <UIcon name="i-fa6-solid:arrow-left" class="text-lg" />
      </RouterLink>
      <UAvatar icon="i-fa6-solid:user" size="sm" />
      <span class="font-medium text-sm">{{ chatName }}</span>
    </div>

    <!-- Messages area -->
    <div class="flex-1 min-h-0 overflow-y-auto">
      <UChatMessages
        :messages="mockMessages"
        :user="{ side: 'right', variant: 'soft' }"
        :assistant="{ side: 'left', variant: 'soft' }"
        :should-scroll-to-bottom="true"
        class="h-full py-4"
      >
        <template #content="{ message }">
          <p
            v-if="isGroup && message.role !== 'user' && (message as any).sender"
            class="text-xs text-white/50 font-medium mb-0.5"
          >
            {{ (message as any).sender }}
          </p>
          <template v-for="part in message.parts" :key="part">
            <p v-if="part.type === 'text'">{{ part.text }}</p>
          </template>
        </template>
      </UChatMessages>
    </div>

    <!-- Input bar -->
    <div class="shrink-0 border-t border-white/10">
      <UChatPrompt
        v-model="messageInput"
        :placeholder="placeholderText"
        :autofocus="false"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>
