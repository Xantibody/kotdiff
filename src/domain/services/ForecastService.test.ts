import { describe, it, expect } from "vitest";
import {
  forecastMonth,
  mean,
  sampleStdDev,
  studentTCdf,
  tValue90,
  reachPhrase,
} from "./ForecastService";

describe("mean / sampleStdDev", () => {
  it("returns 0 for an empty sample", () => {
    expect(mean([])).toBe(0);
    expect(sampleStdDev([])).toBe(0);
  });

  it("returns 0 standard deviation for a single day (n-1 = 0)", () => {
    expect(mean([8])).toBe(8);
    expect(sampleStdDev([8])).toBe(0);
  });

  it("divides by n-1", () => {
    // 2, 4, 4, 4, 5, 5, 7, 9 → 標本標準偏差 (n-1) は 2.13809...
    expect(sampleStdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138_09, 4);
  });
});

describe("studentTCdf", () => {
  it("is 0.5 at t = 0", () => {
    expect(studentTCdf(0, 12)).toBeCloseTo(0.5, 6);
  });

  it("matches the 90th percentile of the t table", () => {
    expect(studentTCdf(1.356, 12)).toBeCloseTo(0.9, 3);
    expect(studentTCdf(1.812, 10)).toBeCloseTo(0.95, 3);
  });

  it("is symmetric", () => {
    expect(studentTCdf(-1.356, 12) + studentTCdf(1.356, 12)).toBeCloseTo(1, 6);
  });
});

describe("tValue90", () => {
  it("returns the tabulated one-sided 90% value", () => {
    expect(tValue90(12)).toBeCloseTo(1.356, 3);
  });

  it("approaches the normal quantile for large samples", () => {
    expect(tValue90(500)).toBeCloseTo(1.282, 3);
  });
});

describe("reachPhrase", () => {
  it("translates a probability into a count out of ten", () => {
    expect(reachPhrase(0.5)).toBe("10回のうち5回");
    expect(reachPhrase(0.04)).toBe("10回のうち0回");
    expect(reachPhrase(0.96)).toBe("10回のうち10回");
  });
});

describe("forecastMonth", () => {
  // sample/normal (2026/02) の実績: 13 日勤務済み・平均 8:00・所定 144:00・残り 4 日
  const actuals = [8.5, 6.3, 9.7, 7.2, 8.9, 6.9, 8.1, 9.3, 7.4, 8, 6.8, 9.5, 7.4];
  const completedTotal = actuals.reduce((a, b) => a + b, 0);

  const input = {
    actuals,
    remainingDays: 4,
    completedTotal,
    todayPlanned: 8.017,
    requiredTotal: 144,
  };

  it("centres the landing estimate on completed + today + mean * remaining", () => {
    const f = forecastMonth(input);
    expect(f.point).toBeCloseTo(completedTotal + 8.017 + f.mean * 4, 6);
  });

  it("brackets the point estimate with an 80% band", () => {
    const f = forecastMonth(input);
    expect(f.low).toBeLessThan(f.point);
    expect(f.high).toBeGreaterThan(f.point);
    expect(f.point - f.low).toBeCloseTo(f.high - f.point, 6);
  });

  it("reports an even chance when the required total sits on the point estimate", () => {
    const f = forecastMonth({ ...input, requiredTotal: 0 });
    expect(f.reachProbability).toBeCloseTo(1, 6);

    const even = forecastMonth({ ...input, requiredTotal: forecastMonth(input).point });
    expect(even.reachProbability).toBeCloseTo(0.5, 6);
    expect(even.verdict).toBe("even");
    expect(even.label).toBe("所定に届くか半々");
  });

  it("needs a longer day than the plain remaining average to be 80% confident", () => {
    const f = forecastMonth(input);
    const plainPace = (144 - completedTotal - 8.017) / 4;
    expect(f.paceForConfidence).not.toBeNull();
    expect(f.paceForConfidence ?? 0).toBeGreaterThan(plainPace);
  });

  it("collapses to a certain verdict with no remaining days", () => {
    const f = forecastMonth({ ...input, remainingDays: 0, requiredTotal: 1000 });
    expect(f.low).toBe(f.point);
    expect(f.high).toBe(f.point);
    expect(f.reachProbability).toBe(0);
    expect(f.verdict).toBe("miss");
    expect(f.paceForConfidence).toBeNull();
  });

  it("survives a month with a single worked day (no spread available)", () => {
    const f = forecastMonth({
      actuals: [8],
      remainingDays: 3,
      completedTotal: 8,
      todayPlanned: 0,
      requiredTotal: 32,
    });
    expect(f.sd).toBe(0);
    expect(f.low).toBe(f.point);
    expect(f.high).toBe(f.point);
    expect(f.paceForConfidence).toBeCloseTo(8, 6);
  });

  it("reports typical / short / long days without statistical wording", () => {
    const f = forecastMonth(input);
    expect(f.typicalDay).toBeCloseTo(f.mean, 6);
    expect(f.shortDay).toBeCloseTo(f.mean - f.sd, 6);
    expect(f.longDay).toBeCloseTo(f.mean + f.sd, 6);
  });
});
