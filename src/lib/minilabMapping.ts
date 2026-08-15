import type { MiniLabMapping } from '../types'

export const miniLab3Mapping: MiniLabMapping = {
  knobs: {
    74: 'tone',
    71: 'reverb',
    76: 'delay',
    77: 'attack',
    93: 'tone',
    18: 'reverb',
    19: 'delay',
    16: 'attack',
  },
  pads: {
    102: 'PAD 1',
    103: 'PAD 2',
    104: 'PAD 3',
    105: 'PAD 4',
    106: 'PAD 5',
    107: 'PAD 6',
    108: 'PAD 7',
    109: 'PAD 8',
  },
}

export function getControlName(cc: number) {
  return miniLab3Mapping.knobs[cc] ?? `CC ${cc}`
}

export function getPadNumberFromCc(cc: number) {
  return miniLab3Mapping.pads[cc] ? cc - 101 : null
}

export function isMiniLabFader(cc: number) {
  return [82, 83, 85, 17].includes(cc)
}
