export function readStoredBpm() {
  const value = Number(localStorage.getItem('minilab-bpm'))
  return Number.isFinite(value) && value >= 40 && value <= 220 ? value : 92
}

export function storeBpm(value: number) {
  localStorage.setItem('minilab-bpm', String(value))
}
