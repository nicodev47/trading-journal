import type { JournalState } from './types/trade';

export type WorkspaceContent = Pick<
  JournalState,
  'trades' | 'missedTrades' | 'weeklyPlans' | 'dailyAnalyses'
>;

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasConsultableTrade = (trade: unknown): boolean => {
  if (!trade || typeof trade !== 'object') return false;

  const candidate = trade as Record<string, unknown>;
  return hasText(candidate.exitDate) || hasText(candidate.entryDate);
};

const hasConsultableMissedTrade = (trade: unknown): boolean => {
  if (!trade || typeof trade !== 'object') return false;

  return hasText((trade as Record<string, unknown>).date);
};

const hasConsultableWeeklyPlan = (plan: unknown): boolean => {
  if (!plan || typeof plan !== 'object') return false;

  const candidate = plan as Record<string, unknown>;
  const screenshots = candidate.calendarScreenshots;

  return (
    hasText(candidate.weekKey) &&
    (hasText(candidate.approach) ||
      hasText(candidate.notes) ||
      (Array.isArray(screenshots) && screenshots.length > 0))
  );
};

const hasConsultableDailyAnalysis = (entry: unknown): boolean => {
  if (!entry || typeof entry !== 'object') return false;

  const candidate = entry as Record<string, unknown>;

  return (
    hasText(candidate.date) &&
    (hasText(candidate.analysis) ||
      hasText(candidate.observations) ||
      (Array.isArray(candidate.caseStudies) && candidate.caseStudies.length > 0))
  );
};

/**
 * Returns true only for data that can be consulted in the journal. Settings,
 * tags, strategies and other metadata do not make an empty workspace visible.
 */
export function hasWorkspaceContent(
  workspace: WorkspaceContent | null | undefined
): boolean {
  if (!workspace) return false;

  return (
    workspace.trades.some(hasConsultableTrade) ||
    workspace.missedTrades.some(hasConsultableMissedTrade) ||
    workspace.weeklyPlans.some(hasConsultableWeeklyPlan) ||
    (workspace.dailyAnalyses ?? []).some(hasConsultableDailyAnalysis)
  );
}
