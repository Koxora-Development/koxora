import { screenshotSizes } from '../content/screenshots';
export interface ScreenshotProps {
  name: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}
/**
 * Real studio screenshots. WebP is served first with a PNG fallback, and the
 * intrinsic size comes from the capture run so the layout never shifts.
 */
export function Screenshot({ name, alt, caption, priority }: ScreenshotProps) {
  const size = screenshotSizes[name];
  if (!size) throw new Error(`Unknown screenshot: ${name}`);
  return (
    <figure className="shot">
      <div className="shot-frame">
        <picture>
          <source srcSet={`/images/studio/${name}.webp`} type="image/webp" />
          <img
            src={`/images/studio/${name}.png`}
            alt={alt}
            width={size.width}
            height={size.height}
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            {...(priority ? { fetchPriority: 'high' as const } : {})}
          />
        </picture>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
