/** FNV-1a 32-bit — stable across builds and runtimes. */
export function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** HSL disc color: mid lightness, moderate saturation (readable on light/dark). */
export function hashStringToColor(value) {
  const hash = hashString(value);
  const hue = hash % 360;
  return `hsl(${hue} 62% 48%)`;
}

/** Relative luminance 0–1 (sRGB). */
export function relativeLuminance(cssColor) {
  const match = cssColor.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (!match) {
    return 0.5;
  }
  const lightness = Number.parseFloat(match[3]) / 100;
  return lightness;
}
