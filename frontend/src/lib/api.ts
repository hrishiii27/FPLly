export class ApiError extends Error {
  status: number
  body: any
  constructor(message: string, status: number, body: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

export async function getJson(path: string) {
  const res = await fetch(path)
  return parseJson(res)
}

export async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return parseJson(res)
}

export async function postForm(path: string, formData: FormData) {
  const res = await fetch(path, { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  const players = data.detected_players || data.detected_players
  if (!res.ok && !players?.length) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data)
  }
  return data
}

function normalizeSquad(raw: any) {
  const players = (raw.detected_players || raw.detected_players || []).map((p: any) => ({
    ...p,
    id: p.id ?? p.id,
    matched: p.matched,
    xPts: p.xPts ?? p.xPts,
  }))
  const transfers = (raw.transfers || []).map((t: any) => ({
    ...t,
    out: t.out || t.out,
    in: t.in || t.in,
    net_gain: t.net_gain ?? t.net_gain,
    reason: t.reason || t.reason,
    price_feasible: t.price_feasible ?? t.price_feasible,
  }))
  const xi = raw.best_xi
  const best_xi = xi
    ? {
        ...xi,
        formation: xi.formation ?? xi.formation,
        total_xpts: xi.total_xpts ?? xi.total_xpts,
        players: (xi.players || []).map((p: any) => ({
          ...p,
          xPts: p.xPts ?? p.xPts,
          is_captain: p.is_captain ?? p.is_captain,
          is_vice: p.is_vice ?? p.is_vice,
        })),
      }
    : xi
  return {
    ...raw,
    detected_players: players,
    detected_count: raw.detected_count ?? raw.detected_count,
    matched_count: raw.matched_count ?? raw.matched_count,
    team_value: raw.team_value ?? raw.team_value,
    bank: raw.bank,
    free_transfers: raw.free_transfers ?? raw.free_transfers,
    transfers,
    best_xi,
    hit_advice: raw.hit_advice || raw.hit_advice,
    note: raw.note,
    chip_suggestions: raw.chip_suggestions || [],
  }
}

export const api = {
  status: async () => {
    const data = await getJson('/api/status')
    return { ...data, ml_mae: data.ml_mae ?? data.ml_mae, next_gw: data.next_gw ?? data.current_gw }
  },
  dashboard: () => getJson('/api/dashboard'),
  predictions: (params: URLSearchParams) => getJson(`/api/predictions?${params}`),
  captain: () => getJson('/api/captain'),
  optimalTeam: () => getJson('/api/optimal-team'),
  fixtures: () => getJson('/api/fixtures'),
  chips: () => getJson('/api/chips'),
  ownership: () => getJson('/api/ownership'),
  differentials: () => getJson('/api/differentials'),
  mlPredictions: () => getJson('/api/ml-predictions'),
  overperformers: () => getJson('/api/overperformers'),
  historical: (name: string) => getJson(`/api/historical/${encodeURIComponent(name)}`),
  players: (q: string) => getJson(`/api/players?q=${encodeURIComponent(q)}`),
  league: (id: string) => postJson('/api/league', { id }),
  chat: async (query: string) => {
    const data = await postJson('/api/chat', { query })
    return { ...data, response: data.response ?? data.response }
  },
  uploadTeam: async (formData: FormData) => normalizeSquad(await postForm('/api/upload-team', formData)),
  uploadTeamIds: async (body: { player_ids: number[]; free_transfers: number; bank?: number }) =>
    normalizeSquad(await postJson('/api/upload-team', body)),
}
