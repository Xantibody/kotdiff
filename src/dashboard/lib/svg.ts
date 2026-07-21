export function linearScale(
  domain: [number, number],
  range: [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) {
    return () => (r0 + r1) / 2;
  }
  return (value: number) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

export function niceRange(min: number, max: number): [number, number] {
  if (min === max) {
    return [min - 1, max + 1];
  }
  const range = max - min;
  const step = niceStep(range / 5);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

export function generateTicks(min: number, max: number, count: number): number[] {
  if (min === max) {
    return [min - 1, min, min + 1];
  }
  const range = max - min;
  const step = niceStep(range / Math.max(count - 1, 1));
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step * 0.001; v += step) {
    ticks.push(Math.round(v * 1e10) / 1e10);
  }
  return ticks;
}

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  let nice: number;
  if (fraction <= 1) {
    nice = 1;
  } else if (fraction <= 2) {
    nice = 2;
  } else if (fraction <= 5) {
    nice = 5;
  } else {
    nice = 10;
  }
  return nice * magnitude;
}
