import { parseDurationToSeconds } from '../src/utils/FuncUtil';

describe('parseDurationToSeconds', () => {
  it('should parse seconds strings', () => {
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('90')).toBe(90);
  });

  it('should parse minutes strings', () => {
    expect(parseDurationToSeconds('30m')).toBe(1800);
    expect(parseDurationToSeconds('1.5m')).toBe(90);
  });

  it('should parse hours strings', () => {
    expect(parseDurationToSeconds('2h')).toBe(7200);
    expect(parseDurationToSeconds('1h30m')).toBe(5400);
  });

  it('should parse days, weeks, years', () => {
    expect(parseDurationToSeconds('1d')).toBe(86400);
    expect(parseDurationToSeconds('1w')).toBe(604800);
    expect(parseDurationToSeconds('1y')).toBe(31536000);
  });

  it('should throw on invalid format', () => {
    expect(() => parseDurationToSeconds('abc')).toThrow();
    expect(() => parseDurationToSeconds('1x')).toThrow();
    expect(() => parseDurationToSeconds('')).toThrow();
  });
});
