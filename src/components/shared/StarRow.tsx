import { asset } from '../../lib/assetUrl';

const STAR_ASSET = asset('assets/images/star-gold.webp');

/** Renders `star-gold.webp` at full strength (earned) or muted (unearned). */
export function StarAsset({ filled, size }: { filled: boolean; size: number }) {
  return (
    <img
      src={STAR_ASSET}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      style={
        filled
          ? { display: 'block' }
          : {
              display: 'block',
              opacity: 0.32,
              filter: 'grayscale(1)',
            }
      }
    />
  );
}

/** A compact row of 3 stars next to a level tile's number. */
export function MiniStarRow({ stars }: { stars: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2].map((i) => (
        <StarAsset key={i} filled={i < stars} size={9} />
      ))}
    </div>
  );
}
