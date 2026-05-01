<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()

const PUBLIC_API = 'https://api.void-rp.ru/api/v1'

interface ProgressionTier {
  tier_name: string
  tier_label: string
  unlocked_at: string
}

interface PlayerProgressionData {
  minecraft_nickname: string
  minecraft_uuid: string
  tiers: ProgressionTier[]
  current_tier: string | null
  current_tier_label: string | null
}

interface LeaderboardEntry {
  rank: number
  minecraft_nickname: string
  minecraft_uuid: string
  unlocked_at: string
}

interface TierLeaderboard {
  tier_name: string
  tier_label: string
  entries: LeaderboardEntry[]
}

interface FullLeaderboard {
  tiers: TierLeaderboard[]
}

const TIER_ICONS: Record<string, string> = {
  create_age:   '⚙️',
  mekanism_age: '🔩',
  ae2_age:      '💾',
  reactor_age:  '⚛️',
  draconic_age: '🐉',
  quantum_age:  '🌌',
  endgame:      '♾️',
}

const loadingLeaderboard = ref(true)
const loadingMine = ref(true)
const leaderboard = ref<FullLeaderboard | null>(null)
const myProgression = ref<PlayerProgressionData | null>(null)
const activeTier = ref<string>('')
const error = ref('')

const myNick = computed(() => launcher.playerStats.minecraftNickname)

const activeTierData = computed<TierLeaderboard | null>(() => {
  if (!leaderboard.value || !activeTier.value) return null
  return leaderboard.value.tiers.find((t) => t.tier_name === activeTier.value) ?? null
})

const unlockedKeys = computed<Set<string>>(() => {
  if (!myProgression.value) return new Set()
  return new Set(myProgression.value.tiers.map((t) => t.tier_name))
})

const enrichedTiers = computed(() => {
  if (!leaderboard.value) return []
  const tierMap: Record<string, ProgressionTier> = {}
  if (myProgression.value) {
    for (const t of myProgression.value.tiers) tierMap[t.tier_name] = t
  }
  return leaderboard.value.tiers.map((tier) => ({
    ...tier,
    icon: TIER_ICONS[tier.tier_name] ?? '🏆',
    unlocked: unlockedKeys.value.has(tier.tier_name),
    unlocked_at: tierMap[tier.tier_name]?.unlocked_at ?? null,
    total: tier.entries.length,
    myRank: tier.entries.find((e) => e.minecraft_nickname.toLowerCase() === myNick.value?.toLowerCase())?.rank ?? null,
  }))
})

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

function fmtDateShort(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(new Date(iso))
}

async function loadLeaderboard() {
  loadingLeaderboard.value = true
  try {
    const resp = await fetch(`${PUBLIC_API}/progression/leaderboard`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: FullLeaderboard = await resp.json()
    leaderboard.value = data
    if (data.tiers.length && !activeTier.value) {
      activeTier.value = data.tiers[0].tier_name
    }
  } catch (e: any) {
    error.value = 'Не удалось загрузить рейтинг.'
  } finally {
    loadingLeaderboard.value = false
  }
}

async function loadMyProgression() {
  const nick = myNick.value
  if (!nick) { loadingMine.value = false; return }
  loadingMine.value = true
  try {
    const resp = await fetch(`${PUBLIC_API}/progression/player/${encodeURIComponent(nick)}`, { cache: 'no-store' })
    if (resp.status === 404) { myProgression.value = null; return }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    myProgression.value = await resp.json()
  } catch {
    // silence — личная прогрессия не критична
  } finally {
    loadingMine.value = false
  }
}

onMounted(() => {
  loadLeaderboard()
  loadMyProgression()
})
</script>

<template>
  <div class="space-y-4">

    <!-- Моя прогрессия -->
    <section class="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">Моя прогрессия</p>

      <div v-if="loadingMine" class="mt-3 flex gap-1.5">
        <div v-for="i in 7" :key="i" class="h-8 flex-1 animate-pulse rounded-xl bg-white/6"></div>
      </div>

      <div v-else-if="myProgression" class="mt-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-white/90">{{ myProgression.minecraft_nickname }}</span>
          <span
            v-if="myProgression.current_tier_label"
            class="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300"
          >
            {{ myProgression.current_tier_label }}
          </span>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <div
            v-for="tier in enrichedTiers"
            :key="tier.tier_name"
            class="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition"
            :class="tier.unlocked ? 'bg-violet-500/15 text-white/90' : 'bg-white/5 text-white/30'"
            :title="tier.unlocked ? fmtDateShort(tier.unlocked_at) : 'Не открыто'"
          >
            <span class="text-sm leading-none">{{ tier.icon }}</span>
            <span class="font-medium">{{ tier.tier_label }}</span>
            <span v-if="tier.myRank && tier.myRank <= 3" class="text-[10px] opacity-70">
              {{ tier.myRank === 1 ? '🥇' : tier.myRank === 2 ? '🥈' : '🥉' }}
            </span>
          </div>
        </div>
      </div>

      <p v-else class="mt-3 text-xs text-white/40">
        Прогрессия появится после первого захода в игру
      </p>
    </section>

    <!-- Лидерборд -->
    <section class="rounded-[20px] border border-white/10 bg-white/[0.03]">
      <div class="border-b border-white/8 px-4 py-3">
        <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">Рейтинг сервера</p>
        <h2 class="mt-1 text-base font-semibold text-white/90">Первооткрыватели эпох</h2>
      </div>

      <div v-if="loadingLeaderboard" class="p-4">
        <div class="h-8 animate-pulse rounded-xl bg-white/6"></div>
        <div class="mt-3 space-y-2">
          <div v-for="i in 5" :key="i" class="h-10 animate-pulse rounded-xl bg-white/4"></div>
        </div>
      </div>

      <template v-else-if="leaderboard">
        <!-- Tier tabs -->
        <div class="flex flex-wrap gap-1.5 px-4 py-3">
          <button
            v-for="tier in enrichedTiers"
            :key="tier.tier_name"
            type="button"
            class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
            :class="
              activeTier === tier.tier_name
                ? 'bg-violet-500/25 text-violet-200'
                : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80'
            "
            @click="activeTier = tier.tier_name"
          >
            <span class="text-sm leading-none">{{ tier.icon }}</span>
            <span>{{ tier.tier_label }}</span>
            <span class="ml-0.5 opacity-55">{{ tier.total }}</span>
          </button>
        </div>

        <!-- Entries -->
        <div v-if="activeTierData" class="border-t border-white/6">
          <div v-if="activeTierData.entries.length === 0" class="px-4 py-6 text-center text-xs text-white/35">
            Пока никто не открыл эту эпоху
          </div>

          <div v-else class="divide-y divide-white/5">
            <div
              v-for="entry in activeTierData.entries"
              :key="entry.minecraft_nickname"
              class="flex items-center gap-3 px-4 py-2.5 transition"
              :class="
                entry.minecraft_nickname.toLowerCase() === myNick?.toLowerCase()
                  ? 'bg-violet-500/10'
                  : 'hover:bg-white/[0.02]'
              "
            >
              <span
                class="w-6 shrink-0 text-center text-sm font-bold"
                :class="
                  entry.rank === 1 ? 'text-yellow-400'
                  : entry.rank === 2 ? 'text-slate-300'
                  : entry.rank === 3 ? 'text-amber-600'
                  : 'text-white/30'
                "
              >
                {{ entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : entry.rank }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white/90">{{ entry.minecraft_nickname }}</p>
              </div>

              <p class="shrink-0 text-[11px] text-white/40">{{ fmtDate(entry.unlocked_at) }}</p>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="px-4 py-6 text-center text-xs text-white/35">{{ error || 'Нет данных' }}</div>
    </section>
  </div>
</template>
