export const DEFAULT_PROFILE_AVATAR = '🍀';

export const TRADER_RANKS = [
  { emoji: '🍀', name: 'Principiante' },
  { emoji: '🧑‍🎓', name: 'Apprendista' },
  { emoji: '🧭', name: 'Esploratore' },
  { emoji: '⚔️', name: 'Stratega' },
  { emoji: '🦅', name: 'Cacciatore' },
  { emoji: '🐺', name: 'Trader Disciplinato' },
  { emoji: '📈', name: 'Analista' },
  { emoji: '🐉', name: 'Maestro' },
  { emoji: '👑', name: 'Élite' },
  { emoji: '🧙‍♂️', name: 'Mago dei mercati' },
] as const;

export const getProfileLevelIcon = (_level: number) => DEFAULT_PROFILE_AVATAR;
