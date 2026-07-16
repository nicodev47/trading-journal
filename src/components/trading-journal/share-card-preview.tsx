import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

interface ShareCardPreviewProps {
  width: number;
  height: number;
  exportRef: Ref<HTMLDivElement>;
  children: ReactNode;
  desktopScale?: number;
}

export function ShareCardPreview({
  width,
  height,
  exportRef,
  children,
  desktopScale = 0.88,
}: ShareCardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(desktopScale);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const updateScale = () => {
      const availableWidth = container.clientWidth;
      const nextScale = Math.min(desktopScale, availableWidth / width);

      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : desktopScale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, [desktopScale, width]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        className="relative mx-auto"
        style={{
          width: width * scale,
          height: height * scale,
        }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <div ref={exportRef} style={{ width, height }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
