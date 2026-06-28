import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Button } from '@/components/ui/button';
import { TUTORIAL_STEPS } from './tutorial-steps';

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type TargetRectState = {
  target: string;
  rect: Rect | null;
};

type CardPositionState = {
  stepIndex: number;
  target: string;
  position: CSSProperties;
};

interface TutorialTourProps {
  active: boolean;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

const CARD_WIDTH = 360;
const CARD_GAP = 12;
const VIEWPORT_PADDING = 16;
const SPOTLIGHT_PADDING = 6;
const ANALYSIS_SPOTLIGHT_PADDING = 14;
const ESTIMATED_CARD_HEIGHT = 260;
const ANALYSIS_TOP_OFFSET = 18;
const SCROLL_KEYS = new Set([
  ' ',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  'Spacebar',
]);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const areRectsEqual = (first: Rect | null, second: Rect | null) => {
  if (first === second) return true;
  if (!first || !second) return false;

  return (
    Math.round(first.top) === Math.round(second.top) &&
    Math.round(first.left) === Math.round(second.left) &&
    Math.round(first.width) === Math.round(second.width) &&
    Math.round(first.height) === Math.round(second.height)
  );
};

function getTargetElement(target: string): HTMLElement | null {
  if (target === 'analysis-section') {
    const overviewElement = document.querySelector<HTMLElement>(
      '[data-tour-target="analysis-overview"]'
    );

    if (overviewElement) return overviewElement;
  }

  return document.querySelector<HTMLElement>(
    `[data-tutorial="${target}"]`
  );
}

function getElementRect(target: string): Rect | null {
  const element = getTargetElement(target);

  if (!element) return null;

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function getRightSideCardPosition(
  rect: Rect,
  width: number,
  verticalOffset = 0
): CSSProperties | null {
  const left = rect.left + rect.width + VIEWPORT_PADDING;
  const hasSpaceRight = left + width <= window.innerWidth - VIEWPORT_PADDING;

  if (!hasSpaceRight) return null;

  return {
    width,
    left,
    top: clamp(
      rect.top + rect.height / 2 - ESTIMATED_CARD_HEIGHT / 2 + verticalOffset,
      VIEWPORT_PADDING,
      window.innerHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING
    ),
  };
}

function getSafeFallbackCardPosition(rect: Rect, width: number): CSSProperties {
  const centeredLeft = clamp(
    rect.left + rect.width / 2 - width / 2,
    VIEWPORT_PADDING,
    window.innerWidth - width - VIEWPORT_PADDING
  );
  const aboveTop = rect.top - VIEWPORT_PADDING - ESTIMATED_CARD_HEIGHT;

  if (aboveTop >= VIEWPORT_PADDING) {
    return {
      width,
      left: centeredLeft,
      top: aboveTop,
    };
  }

  return {
    width,
    left: window.innerWidth - width - VIEWPORT_PADDING,
    top: clamp(
      VIEWPORT_PADDING,
      VIEWPORT_PADDING,
      window.innerHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING
    ),
  };
}

function getAnalysisFallbackCardPosition(rect: Rect, width: number): CSSProperties {
  const left = clamp(
    rect.left + rect.width / 2 - width / 2,
    VIEWPORT_PADDING,
    window.innerWidth - width - VIEWPORT_PADDING
  );
  const belowTop = rect.top + rect.height + CARD_GAP;
  const aboveTop = rect.top - CARD_GAP - ESTIMATED_CARD_HEIGHT;

  if (belowTop + ESTIMATED_CARD_HEIGHT <= window.innerHeight - VIEWPORT_PADDING) {
    return {
      width,
      left,
      top: belowTop,
    };
  }

  if (aboveTop >= VIEWPORT_PADDING) {
    return {
      width,
      left,
      top: aboveTop,
    };
  }

  return getSafeFallbackCardPosition(rect, width);
}

function getCardPosition(rect: Rect | null, target?: string): CSSProperties {
  const width = Math.min(CARD_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2);

  if (window.innerWidth < 768) {
    return {
      width,
      left: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING,
      maxHeight: `min(${ESTIMATED_CARD_HEIGHT}px, calc(100dvh - ${
        VIEWPORT_PADDING * 2
      }px))`,
      overflowY: 'auto',
    };
  }

  if (rect && target === 'calendar') {
    return (
      getRightSideCardPosition(rect, width, -24) ??
      getSafeFallbackCardPosition(rect, width)
    );
  }

  if (rect && target === 'analysis-section') {
    return (
      getRightSideCardPosition(rect, width, -48) ??
      getAnalysisFallbackCardPosition(rect, width)
    );
  }

  if (rect && target === 'trade-editor') {
    const rightLeft = rect.left + rect.width + VIEWPORT_PADDING;
    const hasSpaceRight =
      rightLeft + width <= window.innerWidth - VIEWPORT_PADDING;

    if (hasSpaceRight) {
      return {
        width,
        left: rightLeft,
        top: clamp(
          rect.top + Math.min(72, rect.height * 0.18),
          VIEWPORT_PADDING,
          window.innerHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING
        ),
      };
    }

    const aboveTop = rect.top - VIEWPORT_PADDING - ESTIMATED_CARD_HEIGHT;
    const hasSpaceAbove = aboveTop >= VIEWPORT_PADDING;

    if (hasSpaceAbove) {
      return {
        width,
        left: clamp(
          rect.left + rect.width / 2 - width / 2,
          VIEWPORT_PADDING,
          window.innerWidth - width - VIEWPORT_PADDING
        ),
        top: aboveTop,
      };
    }

    return {
      width,
      left: clamp(
        rect.left + rect.width / 2 - width / 2,
        VIEWPORT_PADDING,
        window.innerWidth - width - VIEWPORT_PADDING
      ),
      top: VIEWPORT_PADDING,
    };
  }

  const centerLeft = rect
    ? rect.left + rect.width / 2 - width / 2
    : window.innerWidth / 2 - width / 2;
  const left = clamp(
    centerLeft,
    VIEWPORT_PADDING,
    window.innerWidth - width - VIEWPORT_PADDING
  );

  if (!rect) {
    return {
      width,
      left,
      top: Math.max(80, window.innerHeight / 2 - 140),
    };
  }

  const below = rect.top + rect.height + CARD_GAP;
  const above = rect.top - CARD_GAP - ESTIMATED_CARD_HEIGHT;
  const hasSpaceBelow =
    below + ESTIMATED_CARD_HEIGHT < window.innerHeight - VIEWPORT_PADDING;
  const top = hasSpaceBelow
    ? below
    : clamp(
        above,
        VIEWPORT_PADDING,
        window.innerHeight - ESTIMATED_CARD_HEIGHT
      );

  return { width, left, top };
}

function getSpotlightPadding(target?: string) {
  if (window.innerWidth < 768) return 4;

  return target === 'analysis-section'
    ? ANALYSIS_SPOTLIGHT_PADDING
    : SPOTLIGHT_PADDING;
}

function getOverlayPieces(rect: Rect | null, target?: string): CSSProperties[] {
  if (!rect) {
    return [{ inset: 0 }];
  }

  const spotlightPadding = getSpotlightPadding(target);
  const top = clamp(rect.top - spotlightPadding, 0, window.innerHeight);
  const left = clamp(rect.left - spotlightPadding, 0, window.innerWidth);
  const right = clamp(
    rect.left + rect.width + spotlightPadding,
    0,
    window.innerWidth
  );
  const bottom = clamp(
    rect.top + rect.height + spotlightPadding,
    0,
    window.innerHeight
  );

  return [
    { top: 0, left: 0, right: 0, height: top },
    { top: bottom, left: 0, right: 0, bottom: 0 },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, right: 0, height: bottom - top },
  ];
}

function isInteractiveKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      'a, button, input, select, textarea, [contenteditable="true"], [role="button"]'
    )
  );
}

export function TutorialTour({
  active,
  stepIndex,
  onNext,
  onSkip,
}: TutorialTourProps) {
  const [targetRectState, setTargetRectState] =
    useState<TargetRectState | null>(null);
  const [isStepReady, setIsStepReady] = useState(false);
  const [cardPositionState, setCardPositionState] =
    useState<CardPositionState | null>(null);
  const nextFrameRef = useRef<number | null>(null);
  const step = TUTORIAL_STEPS[stepIndex];
  const targetRect =
    step && targetRectState?.target === step.target
      ? targetRectState.rect
      : null;

  const hideStepChrome = () => {
    setIsStepReady(false);
    setTargetRectState(step ? { target: step.target, rect: null } : null);
    setCardPositionState(null);
  };

  const commitStepGeometry = (rect: Rect | null) => {
    if (!step || !rect) return false;

    setTargetRectState({ target: step.target, rect });
    setCardPositionState({
      stepIndex,
      target: step.target,
      position: getCardPosition(rect, step.target),
    });
    setIsStepReady(true);

    return true;
  };

  useLayoutEffect(() => {
    hideStepChrome();

    return () => {
      if (nextFrameRef.current !== null) {
        window.cancelAnimationFrame(nextFrameRef.current);
        nextFrameRef.current = null;
      }
    };
  }, [active, stepIndex, step?.target]);

  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscrollBehavior = root.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - root.clientWidth;

    if (scrollbarWidth > 0) {
      const currentPaddingRight = Number.parseFloat(
        window.getComputedStyle(body).paddingRight
      );

      body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
    }

    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    const preventManualScroll = (event: Event) => {
      event.preventDefault();
    };

    const preventScrollKeys = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isInteractiveKeyboardTarget(event.target)) return;

      event.preventDefault();
    };

    window.addEventListener('wheel', preventManualScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener('touchmove', preventManualScroll, {
      passive: false,
      capture: true,
    });
    window.addEventListener('keydown', preventScrollKeys, true);

    return () => {
      window.removeEventListener('wheel', preventManualScroll, true);
      window.removeEventListener('touchmove', preventManualScroll, true);
      window.removeEventListener('keydown', preventScrollKeys, true);

      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;

    hideStepChrome();

    let isCancelled = false;
    let timeout = 0;
    let firstFrame = 0;
    let secondFrame = 0;
    let attempts = 0;

    const measureWhenStable = () => {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (isCancelled) return;

          const nextRect = getElementRect(step.target);

          if (!nextRect && attempts < 12) {
            attempts += 1;
            timeout = window.setTimeout(scrollToTarget, 50);
            return;
          }

          commitStepGeometry(nextRect);
        });
      });
    };

    const scrollToTarget = () => {
      if (isCancelled) return;

      const element = getTargetElement(step.target);

      if (!element && attempts < 12) {
        attempts += 1;
        timeout = window.setTimeout(scrollToTarget, 60);
        return;
      }

      if (!element) {
        return;
      }

      if (step.target === 'analysis-section') {
        const rect = element.getBoundingClientRect();
        const targetTop = window.scrollY + rect.top - ANALYSIS_TOP_OFFSET;

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'auto',
        });

        measureWhenStable();
        return;
      }

      element.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center',
      });
      measureWhenStable();
    };

    timeout = window.setTimeout(scrollToTarget, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [active, step, stepIndex]);

  useEffect(() => {
    if (!active || !step || !isStepReady) return;

    const updateRect = () => {
      const nextRect = getElementRect(step.target);
      if (!nextRect) return;

      setTargetRectState((current) =>
        current?.target === step.target &&
        areRectsEqual(current.rect, nextRect)
          ? current
          : { target: step.target, rect: nextRect }
      );
      setCardPositionState({
        stepIndex,
        target: step.target,
        position: getCardPosition(nextRect, step.target),
      });
    };

    if (step.target === 'trade-editor') {
      let firstFrame = 0;
      let secondFrame = 0;
      const timeout = window.setTimeout(() => {
        firstFrame = window.requestAnimationFrame(() => {
          secondFrame = window.requestAnimationFrame(updateRect);
        });
      }, 80);

      window.addEventListener('resize', updateRect);

      return () => {
        window.clearTimeout(timeout);
        window.cancelAnimationFrame(firstFrame);
        window.cancelAnimationFrame(secondFrame);
        window.removeEventListener('resize', updateRect);
      };
    }

    const timeout = window.setTimeout(updateRect, 220);

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, isStepReady, step, stepIndex]);

  useEffect(() => {
    if (!active) return;

    const unlockCardPosition = () => {
      setCardPositionState(null);
    };

    window.addEventListener('resize', unlockCardPosition);

    return () => {
      window.removeEventListener('resize', unlockCardPosition);
    };
  }, [active]);

  if (!active || !step) return null;

  const descriptionParagraphs = step.description.split('\n\n');
  const cardPosition =
    cardPositionState?.stepIndex === stepIndex &&
    cardPositionState.target === step.target
      ? cardPositionState.position
      : null;
  const spotlightPadding = getSpotlightPadding(step.target);
  const isChromeReady = isStepReady && !!targetRect && !!cardPosition;
  const overlayPieces = getOverlayPieces(
    isChromeReady ? targetRect : null,
    step.target
  );
  const highlightStyle = isChromeReady && targetRect
    ? {
        top: targetRect.top - spotlightPadding,
        left: targetRect.left - spotlightPadding,
        width: targetRect.width + spotlightPadding * 2,
        height: targetRect.height + spotlightPadding * 2,
      }
    : undefined;
  const highlightClassName =
    step.target === 'analysis-section'
      ? 'absolute rounded-[18px] border border-profit/80 shadow-[0_0_10px_rgba(0,214,143,0.22),0_0_22px_rgba(0,214,143,0.12)]'
      : 'absolute rounded-2xl border border-profit/85 shadow-[0_0_22px_rgba(0,214,143,0.28),0_0_42px_rgba(0,214,143,0.14)]';

  return (
    <div className="fixed inset-0 z-[70]">
      {overlayPieces.map((style, index) => (
        <div
          key={index}
          className="absolute bg-black/55"
          style={style}
          aria-hidden="true"
        />
      ))}

      {isChromeReady && highlightStyle && (
        <div
          className={highlightClassName}
          style={highlightStyle}
          aria-hidden="true"
        />
      )}

      {isChromeReady && cardPosition && (
        <div
          className="ej-scrollbar pointer-events-auto absolute rounded-2xl border border-border bg-card p-3.5 shadow-2xl sm:p-4"
          style={cardPosition}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-step-title"
        >
          <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-profit">
            {stepIndex + 1} / {TUTORIAL_STEPS.length}
          </div>

          <h3
            id="tutorial-step-title"
            className="font-sans text-base font-bold text-foreground"
          >
            {step.title}
          </h3>

          <div className="mt-2 space-y-2 font-sans text-[13px] leading-snug text-muted-foreground sm:text-sm">
            {descriptionParagraphs.map((paragraph) => (
              <p key={paragraph}>
                {paragraph.split('\n').map((line, index) => (
                  <span key={line}>
                    {index > 0 ? <br /> : null}
                    {line}
                  </span>
                ))}
              </p>
            ))}
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              className="px-2 text-xs text-muted-foreground hover:text-foreground max-sm:w-full"
              onClick={() => {
                hideStepChrome();
                onSkip();
              }}
            >
              Salta tutorial
            </Button>

            <Button
              type="button"
              className="max-sm:w-full"
              onClick={() => {
                hideStepChrome();

                if (nextFrameRef.current !== null) {
                  window.cancelAnimationFrame(nextFrameRef.current);
                }

                nextFrameRef.current = window.requestAnimationFrame(() => {
                  nextFrameRef.current = null;
                  onNext();
                });
              }}
            >
              {step.cta}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
