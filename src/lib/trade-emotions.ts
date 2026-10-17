export interface TradeEmotion {
  value: string;
  label: string;
  emoji: string;
}

/** Emotions a trader can attach to a trade, from calm ones to the ones that hurt. */
export const TRADE_EMOTIONS: TradeEmotion[] = [
  { value: 'calm', label: 'Calmo', emoji: '😌' },
  { value: 'confident', label: 'Sicuro', emoji: '😎' },
  { value: 'focused', label: 'Concentrato', emoji: '🎯' },
  { value: 'patient', label: 'Paziente', emoji: '🧘' },
  { value: 'euphoric', label: 'Euforico', emoji: '🤩' },
  { value: 'anxious', label: 'Ansioso', emoji: '😰' },
  { value: 'fearful', label: 'Paura', emoji: '😨' },
  { value: 'greedy', label: 'Avido', emoji: '🤑' },
  { value: 'frustrated', label: 'Frustrato', emoji: '😤' },
  { value: 'impatient', label: 'Impaziente', emoji: '⏱️' },
  { value: 'tired', label: 'Stanco', emoji: '🥱' },
  { value: 'distracted', label: 'Distratto', emoji: '📱' },
];

export const getEmotion = (value: string) => TRADE_EMOTIONS.find(item => item.value === value);
