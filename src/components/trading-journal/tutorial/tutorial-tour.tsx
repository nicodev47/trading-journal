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
const ANALYSIS_CARD_GAP = 28;
const VIEWPORT_PADDING = 16;
const SPOTLIGHT_PADDING = 6;
const ANALYSIS_SPOTLIGHT_PADDING = 14;
const ESTIMATED_CARD_HEIGHT = 260;
const ANALYSIS_SCROLL_DELAY = 900;
const ANALYSIS_SCROLL_DURATION = 14000;
const TRADE_EDITOR_OPEN_DURATION = 240;
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
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="tab"]',
].join(', ');

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
  return document.querySelector<HTMLElement>(
    `[data-tutorial="${target}"]`
  );
}

function getTutorialNavbarBottom() {
  const navbar = document.querySelector<HTMLElement>(
    '[data-tutorial-navbar="true"]'
  );

  return navbar?.getBoundingClientRect().bottom ?? 0;
}

function getElementRect(target: string): Rect | null {
  const element = getTargetElement(target);

  if (!element) return null;

  const rect = element.getBoundingClientRect();

  if (target === 'analysis-section') {
    const navbarBottom = getTutorialNavbarBottom();
    const top = navbarBottom + ANALYSIS_SPOTLIGHT_PADDING;

    return {
      top,
      left: Math.max(0, rect.left),
      width: Math.min(rect.width, window.innerWidth),
      height: Math.max(
        0,
        window.innerHeight - navbarBottom - ANALYSIS_SPOTLIGHT_PADDING * 2
      ),
    };
  }

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function getHighlightRects(target: string, fallbackRect: Rect): Rect[] {
  if (target !== 'detailed-stats-equity') return [fallbackRect];

  const partRects = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-tutorial-part="detailed-stats"], [data-tutorial-part="equity"]'
    )
  ).map((element) => {
    const rect = element.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  });

  if (partRects.length === 0) return [fallbackRect];

  const top = Math.min(...partRects.map((rect) => rect.top));
  const left = Math.min(...partRects.map((rect) => rect.left));
  const right = Math.max(
    ...partRects.map((rect) => rect.left + rect.width)
  );
  const bottom = Math.max(
    ...partRects.map((rect) => rect.top + rect.height)
  );

  return [
    {
      top,
      left,
      width: right - left,
      height: bottom - top,
    },
  ];
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

function getTopCenteredCardPosition(width: number): CSSProperties {
  const navbar = document.querySelector<HTMLElement>(
    '[data-tutorial-navbar="true"]'
  );
  const navbarBottom = navbar?.getBoundingClientRect().bottom ?? 0;

  return {
    width,
    left: clamp(
      window.innerWidth / 2 - width / 2,
      VIEWPORT_PADDING,
      window.innerWidth - width - VIEWPORT_PADDING
    ),
    top: clamp(
      navbarBottom + VIEWPORT_PADDING,
      VIEWPORT_PADDING,
      window.innerHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING
    ),
  };
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
      getTopCenteredCardPosition(width)
    );
  }

  if (rect && target === 'analysis-section') {
    const sideLeft = rect.left + rect.width + ANALYSIS_CARD_GAP;
    const fitsOnRight =
      sideLeft + width <= window.innerWidth - VIEWPORT_PADDING;
    const left = fitsOnRight
      ? sideLeft
      : window.innerWidth / 2 - width / 2;

    return {
      width,
      left: clamp(
        left,
        VIEWPORT_PADDING,
        window.innerWidth - width - VIEWPORT_PADDING
      ),
      top: clamp(
        window.innerHeight / 2 - ESTIMATED_CARD_HEIGHT / 2,
        VIEWPORT_PADDING,
        window.innerHeight - ESTIMATED_CARD_HEIGHT - VIEWPORT_PADDING
      ),
    };
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
  if (window.innerWidth < 768) {
    return { horizontal: 4, vertical: 4 };
  }

  if (target === 'stats-grid') {
    return { horizontal: SPOTLIGHT_PADDING, vertical: 0 };
  }

  if (target === 'detailed-stats-equity') {
    return { horizontal: 2, vertical: 0 };
  }

  const padding =
    target === 'analysis-section'
      ? ANALYSIS_SPOTLIGHT_PADDING
      : SPOTLIGHT_PADDING;

  return { horizontal: padding, vertical: padding };
}

function getOverlayPieces(rect: Rect | null, target?: string): CSSProperties[] {
  if (!rect) {
    if (target === 'analysis-section') {
      const navbarBottom = getTutorialNavbarBottom();

      return [{ top: navbarBottom, left: 0, right: 0, bottom: 0 }];
    }

    return [{ inset: 0 }];
  }

  const spotlightPadding = getSpotlightPadding(target);
  const top = clamp(
    rect.top - spotlightPadding.vertical,
    0,
    window.innerHeight
  );
  const left = clamp(
    rect.left - spotlightPadding.horizontal,
    0,
    window.innerWidth
  );
  const right = clamp(
    rect.left + rect.width + spotlightPadding.horizontal,
    0,
    window.innerWidth
  );
  const bottom = clamp(
    rect.top + rect.height + spotlightPadding.vertical,
    0,
    window.innerHeight
  );

  const pieces: CSSProperties[] = [
    { top: bottom, left: 0, right: 0, bottom: 0 },
    { top, left: 0, width: left, height: bottom - top },
    { top, left: right, right: 0, height: bottom - top },
  ];

  if (target !== 'analysis-section') {
    pieces.unshift({ top: 0, left: 0, right: 0, height: top });
  }

  return pieces;
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const nextFrameRef = useRef<number | null>(null);
  const hasPresentedStepRef = useRef(false);
  const step = TUTORIAL_STEPS[stepIndex];
  const targetRect =
    step && targetRectState?.target === step.target
      ? targetRectState.rect
      : null;

  const hideStepChrome = () => {
    setIsTransitioning(true);
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
    setIsTransitioning(false);
    hasPresentedStepRef.current = true;

    return true;
  };

  useLayoutEffect(() => {
    return () => {
      if (nextFrameRef.current !== null) {
        window.cancelAnimationFrame(nextFrameRef.current);
        nextFrameRef.current = null;
      }
    };
  }, [active, stepIndex, step?.target]);

  useEffect(() => {
    if (active) return;

    hasPresentedStepRef.current = false;
    setIsTransitioning(false);
    setIsStepReady(false);
    setTargetRectState(null);
    setCardPositionState(null);
  }, [active]);

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
    if (!active) return;

    const isTutorialControl = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      Boolean(target.closest('[data-tutorial-control="true"]'));

    const blockAppInteraction = (event: Event) => {
      if (isTutorialControl(event.target)) return;
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.closest(INTERACTIVE_SELECTOR)) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const blockAppKeyboardInteraction = (event: KeyboardEvent) => {
      if (isTutorialControl(event.target)) return;
      const isEscape = event.key === 'Escape';
      const isInteractiveActivation =
        (event.key === 'Enter' || event.key === ' ') &&
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest(INTERACTIVE_SELECTOR));

      if (!isEscape && !isInteractiveActivation) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    document.addEventListener('click', blockAppInteraction, true);
    document.addEventListener('pointerdown', blockAppInteraction, true);
    document.addEventListener('submit', blockAppInteraction, true);
    document.addEventListener('keydown', blockAppKeyboardInteraction, true);

    return () => {
      document.removeEventListener('click', blockAppInteraction, true);
      document.removeEventListener('pointerdown', blockAppInteraction, true);
      document.removeEventListener('submit', blockAppInteraction, true);
      document.removeEventListener(
        'keydown',
        blockAppKeyboardInteraction,
        true
      );
    };
  }, [active]);

  useEffect(() => {
    if (!active || !step) return;

    if (hasPresentedStepRef.current) {
      setIsTransitioning(true);
    }

    let isCancelled = false;
    let timeout = 0;
    let firstFrame = 0;
    let secondFrame = 0;
    let analysisScrollFrame = 0;
    let attempts = 0;

    const measureWhenStable = (delay = 0) => {
      if (delay > 0) {
        timeout = window.setTimeout(() => measureWhenStable(), delay);
        return;
      }

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
        const targetTop = window.scrollY + rect.top;

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'auto',
        });

        measureWhenStable();
        timeout = window.setTimeout(() => {
          if (isCancelled) return;

          const startTop = window.scrollY;
          const sectionRect = element.getBoundingClientRect();
          const sectionBottom = startTop + sectionRect.bottom;
          const destination = Math.max(
            startTop,
            sectionBottom - window.innerHeight + VIEWPORT_PADDING
          );
          const distance = destination - startTop;
          const startedAt = window.performance.now();

          const animateAnalysisScroll = (timestamp: number) => {
            if (isCancelled) return;

            const progress = clamp(
              (timestamp - startedAt) / ANALYSIS_SCROLL_DURATION,
              0,
              1
            );
            const easedProgress =
              progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo({
              top: startTop + distance * easedProgress,
              behavior: 'auto',
            });

            if (progress < 1) {
              analysisScrollFrame = window.requestAnimationFrame(
                animateAnalysisScroll
              );
            }
          };

          analysisScrollFrame = window.requestAnimationFrame(
            animateAnalysisScroll
          );
        }, ANALYSIS_SCROLL_DELAY);
        return;
      }

      element.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'center',
      });
      measureWhenStable(
        step.target === 'trade-editor' ? TRADE_EDITOR_OPEN_DURATION : 0
      );
    };

    timeout = window.setTimeout(scrollToTarget, 0);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.cancelAnimationFrame(analysisScrollFrame);
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

  if (!active || !step) return null;

  const descriptionParagraphs = step.description.split('\n\n');
  const cardPosition =
    cardPositionState?.stepIndex === stepIndex &&
    cardPositionState.target === step.target
      ? cardPositionState.position
      : null;
  const spotlightPadding = getSpotlightPadding(step.target);
  const isChromeReady = isStepReady && !!targetRect && !!cardPosition;
  const highlightRects =
    isChromeReady && targetRect
      ? getHighlightRects(step.target, targetRect)
      : [];
  const overlayPieces = getOverlayPieces(
    isChromeReady ? targetRect : null,
    step.target
  );
  const isTourVisible = isChromeReady || isTransitioning;
  const highlightClassName =
    step.target === 'analysis-section'
      ? 'absolute rounded-b-[18px] border-x border-b border-profit/80'
      : 'absolute rounded-2xl border border-profit/85 shadow-[0_0_22px_rgba(0,214,143,0.28),0_0_42px_rgba(0,214,143,0.14)]';

  return (
    <div
      className={`fixed inset-0 z-[70] transition-opacity duration-150 ${
        isTourVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {isTourVisible &&
        (isChromeReady
          ? overlayPieces
          : getOverlayPieces(null, step.target)
        ).map(
          (style, index) => (
          <div
            key={index}
            className="absolute bg-black/55"
            style={style}
            aria-hidden="true"
          />
          )
        )}

      {highlightRects.map((rect, index) => (
        <div
          key={index}
          className={highlightClassName}
          style={{
            top: rect.top - spotlightPadding.vertical,
            left: rect.left - spotlightPadding.horizontal,
            width: rect.width + spotlightPadding.horizontal * 2,
            height: rect.height + spotlightPadding.vertical * 2,
          }}
          aria-hidden="true"
        />
      ))}

      <div
        className="pointer-events-auto absolute inset-0"
        aria-hidden="true"
      />

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
              data-tutorial-control="true"
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
              data-tutorial-control="true"
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
