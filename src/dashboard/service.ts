import DashboardHelper from "./helper";
import {
  ScannerSortBy,
  AbsorptionSortBy,
  VolumeOISortBy,
  SortOrder,
} from "./types/enums";
import {
  IEnrichedRow,
  IScannerQuery,
  ISurgeQuery,
  IDistributionQuery,
  ITrendQuery,
  IAbsorptionQuery,
  ISpreadQuery,
  IVolumeOIQuery,
  IStreakQuery,
  IExpiryCycleQuery,
  ICrossExpiryQuery,
} from "./types/interface";

export default class DashboardService extends DashboardHelper {
  // ─── 1. Scanner Table ─────────────────────────────────────────────────────
  // Filtering, sorting and pagination all happen in Postgres.
  // Two parallel queries: paginated data + summary (count + distribution).
  protected getScannerService = async (query: IScannerQuery) => {
    const {
      instrument,
      buildup_type,
      min_contract_change,
      sort_by = ScannerSortBy.PERCENTAGE_CHANGE,
      sort_order = SortOrder.DESC,
      page = 1,
      limit = 50,
    } = query;

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    // Parse comma-separated buildup_type string → string[]
    const buildup_types = buildup_type
      ? buildup_type
          .toLowerCase()
          .split(",")
          .map((s) => s.trim())
      : undefined;

    const [rawRows, { total_count, distribution }] = await Promise.all([
      this.getScannerRows({
        date,
        instrument,
        buildup_types,
        min_contract_change,
        sort_by,
        sort_order,
        page,
        limit,
      }),
      this.getScannerSummary({
        date,
        instrument,
        buildup_types,
        min_contract_change,
      }),
    ]);

    const rows = rawRows.map(this.enrichRow);
    const sentimentScore = this.calcSentimentScore(distribution, total_count);

    return {
      date,
      total_count,
      page,
      limit,
      summary: { ...distribution, sentiment_score: sentimentScore },
      data: rows.map((r) => ({
        id: r.id,
        symbol: r.name,
        instrument: r.instrument,
        expiry_date: r.expiry_date,
        occurrence_date: r.occurrence_date,
        buildup_type: r.meta.buildup_type,
        current_contracts: r.current_contracts,
        previous_contracts: r.previous_contracts,
        percentage_change_contracts: r.percentage_change_contracts,
        difference_in_contracts: r.difference_in_contracts,
        change_in_oi: r.change_in_oi,
        alert_on_slack: r.alert_on_slack,
        meta: r.meta,
      })),
    };
  };

  // ─── 2. Surge Feed ────────────────────────────────────────────────────────
  protected getSurgesService = async (query: ISurgeQuery): Promise<any> => {
    const {
      min_surge_percent = 150,
      require_positive_oi = true,
      limit = 20,
    } = query;

    const date = await this.resolveDate(query.date);
    if (!date) return null;

    const [rawRows, total_surges] = await Promise.all([
      this.getSurgeRows({
        date,
        min_surge_percent,
        require_positive_oi,
        limit,
      }),
      this.getSurgeCount({ date, min_surge_percent, require_positive_oi }),
    ]);

    return {
      meta_data: { date, total_surges },
      data: rawRows.map(this.enrichRow).map((r) => ({
        symbol: r.name,
        instrument: r.instrument,
        expiry_date: r.expiry_date,
        surge_percent: r.percentage_change_contracts,
        contracts_before: r.previous_contracts,
        contracts_after: r.current_contracts,
        contract_delta: r.difference_in_contracts,
        oi_change: r.change_in_oi,
        buildup_type: r.meta.buildup_type,
        alert_on_slack: r.alert_on_slack,
        meta: r.meta,
      })),
    };
  };

  // ─── 3. Distribution Chart ────────────────────────────────────────────────
  // Full universe always fetched — filtering would corrupt the sentiment ratio.
  protected getDistributionService = async (query: IDistributionQuery) => {
    const { instrument, from, to } = query;

    if (from && to) {
      const rawRows = await this.getRowsInRange({
        fromDate: from,
        toDate: to,
        instrument,
      });
      const rows = rawRows.map(this.enrichRow);

      const byDate = new Map<string, IEnrichedRow[]>();
      for (const row of rows) {
        if (!byDate.has(row.occurrence_date))
          byDate.set(row.occurrence_date, []);
        byDate.get(row.occurrence_date)!.push(row);
      }

      const series = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([seriesDate, dayRows]) => {
          const { distribution, sentimentScore } =
            this.buildDistribution(dayRows);
          return {
            date: seriesDate,
            distribution,
            sentiment_score: sentimentScore,
          };
        });

      return { from, to, series };
    }

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    // Single-date: re-use getScannerSummary — same query, no row transfer needed
    const { distribution, total_count } = await this.getScannerSummary({
      date,
      instrument,
    });
    const sentimentScore = this.calcSentimentScore(distribution, total_count);
    return { date, distribution, sentiment_score: sentimentScore };
  };

  // ─── 4. OI + Price Trend Overlay ─────────────────────────────────────────
  protected getTrendService = async (query: ITrendQuery) => {
    const { symbol, instrument, expiry_date } = query;

    const toDate = await this.resolveDate(query.to, instrument);
    if (!toDate) return null;
    const fromDate = query.from ?? this.subtractDays(toDate, 30);

    const rawRows = await this.getTrendRows({
      symbol,
      fromDate,
      toDate,
      instrument,
      expiryDate: expiry_date,
    });
    if (!rawRows.length) return null;

    const rows = rawRows.map(this.enrichRow);
    const expiryToUse = expiry_date ?? this.getMostActiveExpiry(rows);
    const filtered = expiry_date
      ? rows
      : rows.filter((r) => r.expiry_date === expiryToUse);

    return {
      symbol,
      instrument: filtered[0]?.instrument ?? instrument,
      expiry_date: expiryToUse,
      series: filtered.map((r) => ({
        date: r.occurrence_date,
        current_contracts: r.current_contracts,
        previous_contracts: r.previous_contracts,
        change_in_oi: r.change_in_oi,
        percentage_change_contracts: r.percentage_change_contracts,
        buildup_type: r.meta.buildup_type,
        price_change: this.safeFloat(r.meta.priceChange),
        price_return_1d: this.safeFloat(r.meta.priceReturn1D),
        absorption_score: this.safeFloat(r.meta.absorptionScore),
        fut_spot_spread: this.safeFloat(r.meta.futSpotSpread),
        fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
        volume_to_oi: this.safeFloat(r.meta.volumeToOI),
        intra_day_volatility: this.safeFloat(r.meta.intraDayVolatility),
      })),
    };
  };

  // ─── 5. Absorption Score Tracker ──────────────────────────────────────────
  // Filtering + sorting + limit all pushed to Postgres via getAbsorptionRows.
  protected getAbsorptionService = async (query: IAbsorptionQuery) => {
    const {
      instrument,
      min_score,
      sort_by = AbsorptionSortBy.ABSORPTION_SCORE,
      limit = 20,
    } = query;

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    const rawRows = await this.getAbsorptionRows({
      date,
      instrument,
      min_score,
      sort_by,
      limit,
    });

    return {
      date,
      data: rawRows.map(this.enrichRow).map((r) => {
        const score = this.safeFloat(r.meta.absorptionScore);
        const priceReturn = this.safeFloat(r.meta.priceReturn1D);
        return {
          symbol: r.name,
          instrument: r.instrument,
          expiry_date: r.expiry_date,
          absorption_score: score,
          price_return_1d: priceReturn,
          volume_change_percent: this.safeFloat(r.meta.volumeChangePerc),
          buildup_type: r.meta.buildup_type,
          interpretation: this.classifyAbsorption(score, priceReturn),
        };
      }),
    };
  };

  // ─── 6. FutSpot Spread Monitor ────────────────────────────────────────────
  // universe_mean and universe_std come from Postgres window functions —
  // no second pass or manual stddev calculation needed in Node.
  protected getSpreadService = async (query: ISpreadQuery) => {
    const {
      instrument,
      sort_by = "futSpotSpreadPercent",
      outlier_only = false,
    } = query;

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    const rawRows = await this.getSpreadRows({ date, instrument });
    if (!rawRows.length) return null;

    // universe_mean and universe_std are identical on every row (window fn result)
    const { universe_mean: mean, universe_std: std } = rawRows[0];

    let enriched = rawRows.map(this.enrichRow).map((r, i) => {
      const spreadPercent = this.safeFloat(
        (rawRows[i] as any).meta_data?.futSpotSpreadPerc ??
          r.meta.futSpotSpreadPerc,
      );
      const spread = this.safeFloat(r.meta.futSpotSpread);
      const z = this.zScore(spreadPercent, Number(mean), Number(std));
      return {
        symbol: r.name,
        instrument: r.instrument,
        expiry_date: r.expiry_date,
        fut_spot_spread: spread,
        fut_spot_spread_percent: spreadPercent,
        spread_z_score: parseFloat(z.toFixed(4)),
        is_outlier: Math.abs(z) > 2,
        market_expectation: spread > 0 ? "BULLISH" : "BEARISH",
        buildup_type: r.meta.buildup_type,
      };
    });

    if (outlier_only) enriched = enriched.filter((r) => r.is_outlier);

    enriched.sort((a, b) =>
      sort_by === "futSpotSpread"
        ? Math.abs(b.fut_spot_spread) - Math.abs(a.fut_spot_spread)
        : Math.abs(b.fut_spot_spread_percent) -
          Math.abs(a.fut_spot_spread_percent),
    );

    return {
      date,
      mean_spread_percent: parseFloat(Number(mean).toFixed(4)),
      std_dev_spread: parseFloat(Number(std).toFixed(4)),
      data: enriched,
    };
  };

  // ─── 7. Volume-to-OI Screener ─────────────────────────────────────────────
  // Filtering + sorting pushed to Postgres. Full set returned (no limit)
  // so churn category distribution counts are accurate.
  protected getVolumeOIService = async (query: IVolumeOIQuery) => {
    const {
      instrument,
      min_ratio,
      max_ratio,
      sort_by = VolumeOISortBy.VOLUME_TO_OI,
    } = query;

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    const rawRows = await this.getVolumeOIRows({
      date,
      instrument,
      min_ratio,
      max_ratio,
      sort_by,
    });

    return {
      date,
      data: rawRows.map(this.enrichRow).map((r) => {
        const ratio = this.safeFloat(r.meta.volumeToOI);
        return {
          symbol: r.name,
          instrument: r.instrument,
          expiry_date: r.expiry_date,
          volume_to_oi: ratio,
          volume_change_percent: this.safeFloat(r.meta.volumeChangePerc),
          change_in_oi: r.change_in_oi,
          buildup_type: r.meta.buildup_type,
          churn_category: this.classifyChurn(ratio),
        };
      }),
    };
  };

  // ─── 8. Multi-Day Buildup Streaks ─────────────────────────────────────────
  // Streak logic is inherently sequential — stays in Node.
  protected getStreaksService = async (query: IStreakQuery) => {
    const { instrument, min_streak_days = 3, buildup_type } = query;

    const asOf = await this.resolveDate(query.as_of, instrument);
    if (!asOf) return null;

    const rawRows = await this.getRecentRowsForStreaks({
      asOfDate: asOf,
      daysBack: 30,
      instrument,
    });
    const rows = rawRows.map(this.enrichRow);

    const grouped = new Map<string, IEnrichedRow[]>();
    for (const row of rows) {
      const key = `${row.name}||${row.expiry_date}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }

    const streaks: any[] = [];

    for (const symbolRows of grouped.values()) {
      if (!symbolRows.length) continue;

      const currentType = symbolRows[0].meta.buildup_type;
      if (buildup_type && currentType !== buildup_type) continue;

      let streakDays = 0;
      let totalOIChange = 0;
      let totalPrice = 0;
      let absorptionSum = 0;

      for (const row of symbolRows) {
        if (row.meta.buildup_type !== currentType) break;
        streakDays++;
        totalOIChange += row.change_in_oi;
        totalPrice += this.safeFloat(row.meta.priceChange);
        absorptionSum += this.safeFloat(row.meta.absorptionScore);
      }

      if (streakDays < min_streak_days) continue;

      streaks.push({
        symbol: symbolRows[0].name,
        instrument: symbolRows[0].instrument,
        expiry_date: symbolRows[0].expiry_date,
        current_buildup_type: currentType,
        streak_days: streakDays,
        streak_start_date: symbolRows[streakDays - 1].occurrence_date,
        total_oi_change: totalOIChange,
        cumulative_price_change: parseFloat(totalPrice.toFixed(3)),
        average_absorption: parseFloat((absorptionSum / streakDays).toFixed(3)),
        streak_strength: this.classifyStreakStrength(streakDays),
      });
    }

    streaks.sort((a, b) => b.streak_days - a.streak_days);
    return { as_of: asOf, data: streaks };
  };

  // ─── 9. Expiry Cycle Analysis ─────────────────────────────────────────────
  protected getExpiryCycleService = async (query: IExpiryCycleQuery) => {
    const { symbol, expiry_date, instrument } = query;

    const rawRows = await this.getExpiryCycleRows({
      symbol,
      expiryDate: expiry_date,
      instrument,
    });
    if (!rawRows.length) return null;

    const rows = rawRows.map(this.enrichRow);
    const latest = rows[rows.length - 1];
    const daysLeft = this.daysBetween(latest.occurrence_date, expiry_date);

    const peakRow = rows.reduce((best, r) =>
      Math.abs(r.change_in_oi) > Math.abs(best.change_in_oi) ? r : best,
    );

    return {
      symbol,
      expiry_date,
      instrument: rows[0].instrument,
      days_to_expiry: daysLeft,
      cycle_phase: this.classifyCyclePhase(daysLeft),
      peak_oi_date: peakRow.occurrence_date,
      peak_oi_change: peakRow.change_in_oi,
      series: rows.map((r) => ({
        date: r.occurrence_date,
        days_to_expiry: this.daysBetween(r.occurrence_date, expiry_date),
        change_in_oi: r.change_in_oi,
        current_contracts: r.current_contracts,
        percentage_change_contracts: r.percentage_change_contracts,
        buildup_type: r.meta.buildup_type,
        absorption_score: this.safeFloat(r.meta.absorptionScore),
        fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
        rollover_indicator: daysLeft <= 7 && r.change_in_oi < 0,
      })),
    };
  };

  // ─── 10. Cross-Expiry Comparison ──────────────────────────────────────────
  protected getCrossExpiryService = async (query: ICrossExpiryQuery) => {
    const { symbol, instrument } = query;

    const date = await this.resolveDate(query.date, instrument);
    if (!date) return null;

    const rawRows = await this.getCrossExpiryRows({ symbol, date, instrument });
    if (!rawRows.length) return null;

    const rows = rawRows.map(this.enrichRow);
    const labels = ["NEAR", "MID", "FAR", "FAR2"];

    const expiries = rows.map((r, i) => ({
      label: labels[i] ?? `FAR${i}`,
      expiry_date: r.expiry_date,
      days_to_expiry: this.daysBetween(date, r.expiry_date),
      current_contracts: r.current_contracts,
      previous_contracts: r.previous_contracts,
      change_in_oi: r.change_in_oi,
      percentage_change_contracts: r.percentage_change_contracts,
      pct_change_numeric: r.pct_change_numeric,
      fut_spot_spread_percent: this.safeFloat(r.meta.futSpotSpreadPerc),
      buildup_type: r.meta.buildup_type,
      volume_to_oi: this.safeFloat(r.meta.volumeToOI),
      absorption_score: this.safeFloat(r.meta.absorptionScore),
    }));

    const dominantExpiry = expiries.reduce((best, e) =>
      Math.abs(e.change_in_oi) > Math.abs(best.change_in_oi) ? e : best,
    ).expiry_date;

    return {
      symbol,
      date,
      instrument: rows[0].instrument,
      expiries,
      rollover_signal: this.classifyRollover(expiries),
      dominant_expiry: dominantExpiry,
    };
  };

  // ─── 11. Available dates ──────────────────────────────────────────────────
  protected getAvailableDatesService = async ({
    instrument,
  }: {
    instrument?: string;
  }) => this.getAvailableDatesDb({ instrument });

  // ─── 12. Available expiry dates ───────────────────────────────────────────
  protected getAvailableExpiryDatesService = async ({
    instrument,
  }: {
    instrument?: string;
  }) => this.getAvailableExpiryDatesDb({ instrument });

  // ─── 13. Available symbols ────────────────────────────────────────────────
  protected getAvailableSymbolsService = async ({
    instrument,
  }: {
    instrument?: string;
  }) => this.getAvailableSymbolsDb({ instrument });
}
