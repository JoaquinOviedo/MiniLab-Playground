import type { MiniLabMapping } from '../types'

export const miniLab3Mapping: MiniLabMapping = {
  knobs: {
    74: 'tone',
    71: 'reverb',
    76: 'delay',
    19: 'attack',
  },
  pads: {
    36: 'PAD 1',
    37: 'PAD 2',
    38: 'PAD 3',
    39: 'PAD 4',
    40: 'PAD 5',
    41: 'PAD 6',
    42: 'PAD 7',
    43: 'PAD 8',
  },
}

export function getControlName(cc: number) {
  return miniLab3Mapping.knobs[cc] ?? `CC ${cc}`
}

export function isLikelyPad(note: number) {
  return note >= 36 && note <= 43
}
