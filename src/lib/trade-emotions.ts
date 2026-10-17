export interface TradeEmotion {
  value: string;
  label: string;
  emoji: string;
}

/** Emotions a trader can attach to a trade. */
export const TRADE_EMOTIONS: TradeEmotion[] = [
  { value: 'confident', label: 'Sicuro', emoji: '💪' },
  { value: 'anxious', label: 'Ansioso', emoji: '🥶' },
  { value: 'fomo', label: 'FOMO', emoji: '🏃' },
  { value: 'greedy', label: 'Avido', emoji: '🤑' },
  { value: 'fearful', label: 'Pauroso', emoji: '😨' },
  { value: 'patient', label: 'Paziente', emoji: '🧘' },
  { value: 'impatient', label: 'Impaziente', emoji: '⏰' },
  { value: 'focused', label: 'Concentrato', emoji: '🎯' },
  { value: 'excited', label: 'Entusiasta', emoji: '🚀' },
  { value: 'frustrated', label: 'Frustrato', emoji: '😤' },
];

export const getEmotion = (value: string) => TRADE_EMOTIONS.find(item => item.value === value);

/** Key under which the colour of an emotion chip is stored with the tag colours. */
export const emotionColorKey = (value: string) => `emotion:${value}`;
