<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const PUBLIC_API = 'https://api.void-rp.ru/api/v1'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressionTier { tier_name: string; tier_label: string; unlocked_at: string }
interface PlayerProgressionData {
  minecraft_nickname: string; tiers: ProgressionTier[]
  current_tier_label: string | null
}
interface LeaderboardEntry { rank: number; minecraft_nickname: string; unlocked_at: string }
interface TierLeaderboard { tier_name: string; tier_label: string; entries: LeaderboardEntry[] }
interface FullLeaderboard { tiers: TierLeaderboard[] }

interface PlayerTopEntry { rank: number; minecraft_nickname: string; value: number; last_seen_at: string | null }
interface PlayerTopCategory { key: string; label: string; unit: string; entries: PlayerTopEntry[] }
interface PlayerTopResponse { categories: PlayerTopCategory[] }

interface NationRankingItem {
  slug: string; title: string; tag: string; accent_color?: string; icon_url?: string
  members_count: number; treasury_balance: number; territory_points: number
  total_playtime_minutes: number; pvp_kills: number; mob_kills: number
  prestige_score: number; score: number
}
interface NationRankingResponse { items: NationRankingItem[] }

// ─── Main tabs ────────────────────────────────────────────────────────────────

type MainTab = 'progression' | 'players' | 'nations'
const mainTab = ref<MainTab>('progression')

// ─── Progression ──────────────────────────────────────────────────────────────

const TIER_ICONS: Record<string, string> = {
  create_age: '⚙️', mekanism_age: '🔩', ae2_age: '💾',
  reactor_age: '⚛️', draconic_age: '🐉', quantum_age: '🌌', endgame: '♾️',
}
const loadingLeaderboard = ref(true)
const loadingMine = ref(true)
const leaderboard = ref<FullLeaderboard | null>(null)
const myProgression = ref<PlayerProgressionData | null>(null)
const activeTier = ref('')
const progressionError = ref('')

const myNick = computed(() => launcher.playerStats.minecraftNickname)

const unlockedKeys = computed<Set<string>>(() => {
  if (!myProgression.value) return new Set()
  return new Set(myProgression.value.tiers.map(t => t.tier_name))
})

const enrichedTiers = computed(() => {
  if (!leaderboard.value) return []
  const tierMap: Record<string, ProgressionTier> = {}
  if (myProgression.value) for (const t of myProgression.value.tiers) tierMap[t.tier_name] = t
  return leaderboard.value.tiers.map(tier => ({
    ...tier,
    icon: TIER_ICONS[tier.tier_name] ?? '🏆',
    unlocked: unlockedKeys.value.has(tier.tier_name),
    unlocked_at: tierMap[tier.tier_name]?.unlocked_at ?? null,
    total: tier.entries.length,
    myRank: tier.entries.find(e => e.minecraft_nickname.toLowerCase() === myNick.value?.toLowerCase())?.rank ?? null,
  }))
})

const activeTierData = computed<TierLeaderboard | null>(() => {
  if (!leaderboard.value || !activeTier.value) return null
  return leaderboard.value.tiers.find(t => t.tier_name === activeTier.value) ?? null
})

// ─── Player top ───────────────────────────────────────────────────────────────

const loadingPlayers = ref(false)
const playersData = ref<PlayerTopResponse | null>(null)
const activePlayerCat = ref('')
const playersError = ref('')

const PLAYER_ICONS: Record<string, string> = {
  balance: '💰', pvp_kills: '⚔️', mob_kills: '🗡️', playtime: '⏱️',
  blocks_broken: '⛏️', blocks_placed: '🏗️', completed_quests: '📜', deaths: '☠️',
}

const activePlayerCategory = computed<PlayerTopCategory | null>(() => {
  if (!playersData.value || !activePlayerCat.value) return null
  return playersData.value.categories.find(c => c.key === activePlayerCat.value) ?? null
})

function fmtPlayerValue(value: number, unit: string): string {
  const n = new Intl.NumberFormat('ru-RU').format(Math.floor(value))
  return unit ? `${n} ${unit}` : n
}

// ─── Nations ─────────────────────────────────────────────────────────────────

const loadingNations = ref(false)
const nationsData = ref<NationRankingResponse | null>(null)
const activeNationMetric = ref('score')
const nationsError = ref('')

type NationKey = keyof NationRankingItem

const NATION_METRICS: { key: NationKey; label: string; icon: string; fmt: (n: NationRankingItem) => string }[] = [
  { key: 'score',                  label: 'Общий',      icon: '🏆', fmt: n => String(Math.floor(n.score)) },
  { key: 'treasury_balance',       label: 'Казна',      icon: '💰', fmt: n => new Intl.NumberFormat('ru-RU').format(Math.floor(n.treasury_balance)) + ' ₽' },
  { key: 'territory_points',       label: 'Территория', icon: '🗺️', fmt: n => new Intl.NumberFormat('ru-RU').format(n.territory_points) },
  { key: 'prestige_score',         label: 'Престиж',    icon: '⭐', fmt: n => new Intl.NumberFormat('ru-RU').format(n.prestige_score) },
  { key: 'pvp_kills',              label: 'PvP',        icon: '⚔️', fmt: n => new Intl.NumberFormat('ru-RU').format(n.pvp_kills) },
  { key: 'total_playtime_minutes', label: 'Онлайн',     icon: '⏱️', fmt: n => Math.floor(n.total_playtime_minutes / 60) + ' ч' },
]

const sortedNations = computed(() => {
  if (!nationsData.value) return []
  const key = activeNationMetric.value as NationKey
  return [...nationsData.value.items]
    .sort((a, b) => Number(b[key]) - Number(a[key]))
    .map((item, i) => ({ ...item, rank: i + 1 }))
})

const activeNationMetricDef = computed(() =>
  NATION_METRICS.find(m => m.key === activeNationMetric.value) ?? NATION_METRICS[0]
)

// ─── Loaders ─────────────────────────────────────────────────────────────────

async function loadLeaderboard() {
  loadingLeaderboard.value = true
  try {
    const resp = await fetch(`${PUBLIC_API}/progression/leaderboard`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: FullLeaderboard = await resp.json()
    leaderboard.value = data
    if (data.tiers.length && !activeTier.value) activeTier.value = data.tiers[0].tier_name
  } catch { progressionError.value = 'Не удалось загрузить рейтинг прогрессии.' }
  finally { loadingLeaderboard.value = false }
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
  } catch { /* silence */ }
  finally { loadingMine.value = false }
}

async function loadPlayers() {
  if (playersData.value) return
  loadingPlayers.value = true
  try {
    const resp = await fetch(`${PUBLIC_API}/players/top`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data: PlayerTopResponse = await resp.json()
    playersData.value = data
    if (data.categories.length && !activePlayerCat.value) activePlayerCat.value = data.categories[0].key
  } catch { playersError.value = 'Не удалось загрузить топ игроков.' }
  finally { loadingPlayers.value = false }
}

async function loadNations() {
  if (nationsData.value) return
  loadingNations.value = true
  try {
    const resp = await fetch(`${PUBLIC_API}/nation-stats/rankings`, { cache: 'no-store' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    nationsData.value = await resp.json()
  } catch { nationsError.value = 'Не удалось загрузить рейтинг государств.' }
  finally { loadingNations.value = false }
}

function switchTab(tab: MainTab) {
  mainTab.value = tab
  if (tab === 'players') loadPlayers()
  if (tab === 'nations') loadNations()
}

function headUrl(nick: string) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(nick)}/24`
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}
function fmtDateShort(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' }).format(new Date(iso))
}

onMounted(() => {
  loadLeaderboard()
  loadMyProgression()
})
</script>

<template>
  <div class="space-y-3">

    <!-- Main tab switcher -->
    <div class="flex gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.03] p-1.5">
      <button
        v-for="tab in (['progression', 'players', 'nations'] as MainTab[])"
        :key="tab"
        type="button"
        class="flex-1 rounded-[14px] py-1.5 text-xs font-semibold transition"
        :class="mainTab === tab ? 'bg-violet-500/25 text-violet-200' : 'text-white/45 hover:text-white/70'"
        @click="switchTab(tab)"
      >
        {{ tab === 'progression' ? '⚙️ Прогрессия' : tab === 'players' ? '⚔️ Игроки' : '🏰 Государства' }}
      </button>
    </div>

    <!-- ─── PROGRESSION ─────────────────────────────────────────────────── -->
    <template v-if="mainTab === 'progression'">

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
            >{{ myProgression.current_tier_label }}</span>
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
        <p v-else class="mt-3 text-xs text-white/40">Прогрессия появится после первого захода в игру</p>
      </section>

      <!-- Лидерборд по эпохам -->
      <section class="rounded-[20px] border border-white/10 bg-white/[0.03]">
        <div class="border-b border-white/8 px-4 py-3">
          <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">Рейтинг эпох</p>
          <h2 class="mt-1 text-base font-semibold text-white/90">Первооткрыватели</h2>
        </div>
        <div v-if="loadingLeaderboard" class="p-4 space-y-2">
          <div class="h-8 animate-pulse rounded-xl bg-white/6"></div>
          <div v-for="i in 5" :key="i" class="h-10 animate-pulse rounded-xl bg-white/4"></div>
        </div>
        <template v-else-if="leaderboard">
          <div class="flex flex-wrap gap-1.5 px-4 py-3">
            <button
              v-for="tier in enrichedTiers"
              :key="tier.tier_name"
              type="button"
              class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
              :class="activeTier === tier.tier_name
                ? 'bg-violet-500/25 text-violet-200'
                : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80'"
              @click="activeTier = tier.tier_name"
            >
              <span class="text-sm leading-none">{{ tier.icon }}</span>
              <span>{{ tier.tier_label }}</span>
              <span class="ml-0.5 opacity-55">{{ tier.total }}</span>
            </button>
          </div>
          <div v-if="activeTierData" class="border-t border-white/6">
            <div v-if="activeTierData.entries.length === 0" class="px-4 py-6 text-center text-xs text-white/35">
              Пока никто не открыл эту эпоху
            </div>
            <div v-else class="divide-y divide-white/5">
              <div
                v-for="entry in activeTierData.entries"
                :key="entry.minecraft_nickname"
                class="flex items-center gap-3 px-4 py-2.5 transition"
                :class="entry.minecraft_nickname.toLowerCase() === myNick?.toLowerCase() ? 'bg-violet-500/10' : 'hover:bg-white/[0.02]'"
              >
                <span
                  class="w-6 shrink-0 text-center text-sm font-bold"
                  :class="entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/30'"
                >
                  {{ entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : entry.rank }}
                </span>
                <img :src="headUrl(entry.minecraft_nickname)" :alt="entry.minecraft_nickname" class="h-6 w-6 shrink-0 rounded-md" loading="lazy" />
                <p class="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{{ entry.minecraft_nickname }}</p>
                <p class="shrink-0 text-[11px] text-white/40">{{ fmtDate(entry.unlocked_at) }}</p>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="px-4 py-6 text-center text-xs text-white/35">{{ progressionError || 'Нет данных' }}</div>
      </section>
    </template>

    <!-- ─── PLAYERS ────────────────────────────────────────────────────── -->
    <template v-else-if="mainTab === 'players'">
      <section class="rounded-[20px] border border-white/10 bg-white/[0.03]">
        <div class="border-b border-white/8 px-4 py-3">
          <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">Топ игроков</p>
          <h2 class="mt-1 text-base font-semibold text-white/90">Лучшие сезона</h2>
        </div>

        <div v-if="loadingPlayers" class="p-4 space-y-2">
          <div class="h-8 animate-pulse rounded-xl bg-white/6"></div>
          <div v-for="i in 10" :key="i" class="h-10 animate-pulse rounded-xl bg-white/4"></div>
        </div>

        <template v-else-if="playersData">
          <!-- Category tabs -->
          <div class="flex flex-wrap gap-1.5 px-4 py-3">
            <button
              v-for="cat in playersData.categories"
              :key="cat.key"
              type="button"
              class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
              :class="activePlayerCat === cat.key
                ? 'bg-violet-500/25 text-violet-200'
                : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80'"
              @click="activePlayerCat = cat.key"
            >
              <span class="leading-none">{{ PLAYER_ICONS[cat.key] ?? '📊' }}</span>
              <span>{{ cat.label }}</span>
            </button>
          </div>

          <!-- Entries -->
          <div v-if="activePlayerCategory" class="border-t border-white/6 divide-y divide-white/5">
            <div
              v-for="entry in activePlayerCategory.entries"
              :key="entry.minecraft_nickname"
              class="flex items-center gap-3 px-4 py-2.5 transition"
              :class="entry.minecraft_nickname.toLowerCase() === myNick?.toLowerCase() ? 'bg-violet-500/10' : 'hover:bg-white/[0.02]'"
            >
              <span
                class="w-6 shrink-0 text-center text-sm font-bold"
                :class="entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-amber-600' : 'text-white/30'"
              >
                {{ entry.rank <= 3 ? (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') : entry.rank }}
              </span>
              <img :src="headUrl(entry.minecraft_nickname)" :alt="entry.minecraft_nickname" class="h-6 w-6 shrink-0 rounded-md" loading="lazy" />
              <p class="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{{ entry.minecraft_nickname }}</p>
              <p class="shrink-0 text-sm font-semibold text-white/80">{{ fmtPlayerValue(entry.value, activePlayerCategory.unit) }}</p>
            </div>
          </div>
        </template>

        <div v-else class="px-4 py-6 text-center text-xs text-white/35">{{ playersError || 'Нет данных' }}</div>
      </section>
    </template>

    <!-- ─── NATIONS ────────────────────────────────────────────────────── -->
    <template v-else-if="mainTab === 'nations'">
      <section class="rounded-[20px] border border-white/10 bg-white/[0.03]">
        <div class="border-b border-white/8 px-4 py-3">
          <p class="text-[10px] uppercase tracking-[0.22em] text-white/45">Рейтинг государств</p>
          <h2 class="mt-1 text-base font-semibold text-white/90">Силы сезона</h2>
        </div>

        <div v-if="loadingNations" class="p-4 space-y-2">
          <div class="h-8 animate-pulse rounded-xl bg-white/6"></div>
          <div v-for="i in 8" :key="i" class="h-12 animate-pulse rounded-xl bg-white/4"></div>
        </div>

        <template v-else-if="nationsData">
          <!-- Metric tabs -->
          <div class="flex flex-wrap gap-1.5 px-4 py-3">
            <button
              v-for="m in NATION_METRICS"
              :key="m.key"
              type="button"
              class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition"
              :class="activeNationMetric === m.key
                ? 'bg-violet-500/25 text-violet-200'
                : 'bg-white/6 text-white/50 hover:bg-white/10 hover:text-white/80'"
              @click="activeNationMetric = m.key"
            >
              <span class="leading-none">{{ m.icon }}</span>
              <span>{{ m.label }}</span>
            </button>
          </div>

          <!-- Entries -->
          <div class="border-t border-white/6 divide-y divide-white/5">
            <div
              v-for="nation in sortedNations"
              :key="nation.slug"
              class="flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.02]"
            >
              <span
                class="w-6 shrink-0 text-center text-sm font-bold"
                :class="nation.rank === 1 ? 'text-yellow-400' : nation.rank === 2 ? 'text-slate-300' : nation.rank === 3 ? 'text-amber-600' : 'text-white/30'"
              >
                {{ nation.rank <= 3 ? (nation.rank === 1 ? '🥇' : nation.rank === 2 ? '🥈' : '🥉') : nation.rank }}
              </span>
              <div
                v-if="nation.icon_url"
                class="h-7 w-7 shrink-0 overflow-hidden rounded-[10px] border border-white/10"
              >
                <img :src="nation.icon_url" :alt="nation.title" class="h-full w-full object-cover" />
              </div>
              <div
                v-else
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-[10px] font-bold text-white/60"
              >{{ (nation.tag || '??').slice(0, 2) }}</div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-white/90">{{ nation.title }}</p>
                <p class="text-[10px] text-white/35">{{ nation.tag }} · {{ nation.members_count }} чел.</p>
              </div>
              <p class="shrink-0 text-sm font-bold text-white/80">{{ activeNationMetricDef.fmt(nation) }}</p>
            </div>
            <div v-if="sortedNations.length === 0" class="px-4 py-6 text-center text-xs text-white/35">
              Нет данных по государствам
            </div>
          </div>
        </template>

        <div v-else class="px-4 py-6 text-center text-xs text-white/35">{{ nationsError || 'Нет данных' }}</div>
      </section>
    </template>

  </div>
</template>
