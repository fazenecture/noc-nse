import DashboardDb from "./db";
import { IProcessedDataRow, IMetaData, IEnrichedRow } from "./types/interface";

export default class DashboardHelper extends DashboardDb {
  // ─── Request param parsers (used in controller) ───────────────────────────────
  public str = (v: any): string | undefined =>
    typeof v === "string" && v ? v : undefined;

  public num = (v: any): number | undefined =>
    v !== undefined ? parseFloat(v) : undefined;

  public bool = (v: any): boolean => v === "true";

  public int = (v: any, def: number): number =>
    v !== undefined ? parseInt(v) : def;

  // ─── Resolve date: use provided or fall back to latest in DB ─────────────────
  protected resolveDate = async (
    date?: string,
    instrument?: string,
  ): Promise<string | null> => {
    return (
      date ??
      (await this.getLatestDate({
        instrument,
      }))
    );
  };

  // ─── Parse meta_data JSON string safely ──────────────────────────────────────
  protected parseMeta = (metaStr: string): IMetaData => {
    try {
      if (typeof metaStr === "string") {
        return JSON.parse(metaStr);
      }
      return metaStr;
    } catch {
      return {} as IMetaData;
    }
  };

  // ─── Convert pct_change to a finite sortable number ──────────────────────────
  // "Infinity" or Infinity → 999999 so it sorts to top on desc
  protected pctToNumeric = (val: number | string): number => {
    if (val === "Infinity" || val === Infinity) return 999999;
    if (val === "-Infinity" || val === -Infinity) return -999999;
    const n = parseFloat(String(val));
    return isFinite(n) ? n : 0;
  };

  // ─── Safe float — returns fallback for Infinity / NaN / undefined ─────────────
  protected safeFloat = (val: any, fallback = 0): number => {
    const n = parseFloat(val);
    return isFinite(n) ? n : fallback;
  };

  // ─── Enrich a raw DB row with parsed meta + computed fields ──────────────────
  protected enrichRow = (row: IProcessedDataRow): IEnrichedRow => {
    const meta = this.parseMeta(row.meta_data);
    const pct_change_numeric = this.pctToNumeric(
      row.percentage_change_contracts,
    );
    const alert_on_slack =
      row.current_contracts > 1.5 * row.previous_contracts &&
      row.change_in_oi > 0;
    return { ...row, meta, pct_change_numeric, alert_on_slack };
  };

  // ─── Build buildup distribution + sentiment score from enriched rows ──────────
  protected buildDistribution = (rows: IEnrichedRow[]) => {
    const counts: Record<string, number> = {
      long_buildup: 0,
      short_buildup: 0,
      short_covering: 0,
      long_unwinding: 0,
      indecisive: 0,
    };
    for (const row of rows) {
      const bt = row.meta?.buildup_type;
      if (bt && bt in counts) counts[bt]++;
    }
    const total = rows.length || 1;
    const distribution: Record<string, { count: number; percent: number }> = {};
    for (const [key, count] of Object.entries(counts)) {
      distribution[key] = {
        count,
        percent: parseFloat(((count / total) * 100).toFixed(1)),
      };
    }
    // Net bullish ratio: (long_buildup + short_covering) / total
    const sentimentScore = parseFloat(
      ((counts.long_buildup + counts.short_covering) / total).toFixed(3),
    );
    return { distribution, sentimentScore };
  };

  // ─── Absorption interpretation ────────────────────────────────────────────────
  protected classifyAbsorption = (
    score: number,
    priceReturn: number,
  ): string => {
    if (score > 1.5 && Math.abs(priceReturn) < 0.02)
      return "STEALTH_ACCUMULATION";
    if (score > 1.5 && priceReturn > 0.02) return "HIGH_VOLUME_MOVE";
    if (score < -1.0) return "STEALTH_DISTRIBUTION";
    return "NORMAL";
  };

  // ─── Volume-to-OI churn category ─────────────────────────────────────────────
  protected classifyChurn = (ratio: number): string => {
    if (ratio < 0.3) return "LOW";
    if (ratio < 0.7) return "MODERATE";
    if (ratio < 1.5) return "HIGH";
    return "EXTREME";
  };

  // ─── Streak strength label ────────────────────────────────────────────────────
  protected classifyStreakStrength = (days: number): string => {
    if (days >= 10) return "EXTREME";
    if (days >= 6) return "STRONG";
    if (days >= 4) return "MODERATE";
    return "WEAK";
  };

  // ─── Expiry cycle phase ───────────────────────────────────────────────────────
  protected classifyCyclePhase = (daysToExpiry: number): string => {
    if (daysToExpiry <= 1) return "EXPIRY_DAY";
    if (daysToExpiry <= 7) return "EXPIRY_WEEK";
    if (daysToExpiry <= 30) return "MID_CYCLE";
    return "BUILDUP";
  };

  // ─── Rollover signal from cross-expiry data ───────────────────────────────────
  protected classifyRollover = (expiries: any[]): string => {
    if (expiries.length < 2) return "SINGLE_EXPIRY";
    const [near, mid] = expiries;
    if (mid.pct_change_numeric > near.pct_change_numeric * 1.5)
      return "EARLY_ROLLOVER";
    if (near.current_contracts > mid.current_contracts * 5)
      return "AGGRESSIVE_NEAR";
    return "NORMAL_ROLLOVER";
  };

  // ─── Most active expiry by total |OI change| ─────────────────────────────────
  protected getMostActiveExpiry = (rows: IEnrichedRow[]): string => {
    const oiByExpiry = new Map<string, number>();
    for (const row of rows) {
      oiByExpiry.set(
        row.expiry_date,
        (oiByExpiry.get(row.expiry_date) ?? 0) + Math.abs(row.change_in_oi),
      );
    }
    return [...oiByExpiry.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  };

  // ─── Standard deviation ───────────────────────────────────────────────────────
  protected stdDev = (values: number[]): number => {
    const n = values.length;
    if (n === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n);
  };

  // ─── Z-score ──────────────────────────────────────────────────────────────────
  protected zScore = (value: number, mean: number, std: number): number => {
    if (std === 0) return 0;
    return parseFloat(((value - mean) / std).toFixed(3));
  };

  // ─── Paginate array ───────────────────────────────────────────────────────────
  protected paginate = <T>(arr: T[], page: number, limit: number): T[] => {
    return arr.slice((page - 1) * limit, page * limit);
  };

  // ─── Parse DD-MM-YYYY → Date ─────────────────────────────────────────────────
  protected parseDDMMYYYY = (dateStr: string): Date => {
    const [d, m, y] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // ─── Days between two DD-MM-YYYY strings ─────────────────────────────────────
  protected daysBetween = (from: string, to: string): number => {
    const diff =
      this.parseDDMMYYYY(to).getTime() - this.parseDDMMYYYY(from).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  // ─── Subtract N days from a DD-MM-YYYY string ────────────────────────────────
  protected subtractDays = (dateStr: string, days: number): string => {
    const d = this.parseDDMMYYYY(dateStr);
    d.setDate(d.getDate() - days);
    return [
      String(d.getDate()).padStart(2, "0"),
      String(d.getMonth() + 1).padStart(2, "0"),
      d.getFullYear(),
    ].join("-");
  };

  protected calcSentimentScore = (
    distribution: Record<string, number>,
    total: number,
  ): number => {
    const bullish =
      (distribution["long_buildup"] ?? 0) +
      (distribution["short_covering"] ?? 0);
    return total > 0 ? parseFloat((bullish / total).toFixed(4)) : 0;
  };
}
