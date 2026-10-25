import { screenshotSizes } from '../content/screenshots';
export interface ScreenshotProps {
  name: string;
  alt: string;
  /** Names the picture inside its frame, so it cannot be read as live chrome. */
  label: string;
  caption?: string;
  priority?: boolean;
}
/**
 * Real studio screenshots. WebP is served first with a PNG fallback, and the
 * intrinsic size comes from the capture run so the layout never shifts.
 */
export function Screenshot({
  name,
  alt,
  label,
  caption,
  priority,
}: ScreenshotProps) {
  const size = screenshotSizes[name];
  if (!size) throw new Error(`Unknown screenshot: ${name}`);
  return (
    <figure className="shot">
      <div className="shot-frame">
        {/* The site header is sticky, so it comes to rest directly above this
            frame while a reader scrolls. Without a strip naming the picture,
            the two headers read as one application. */}
        <p className="shot-label">{label}</p>
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
