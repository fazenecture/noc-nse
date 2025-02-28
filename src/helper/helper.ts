import { IContractsData } from "../types";

export default class NSEHelper {
  public checkCondition = (
    data: IContractsData[]
  ): { date: string; previousDate: string }[] => {
    const occurrences: any = [];

    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      const currentContracts =
        parseFloat(current.FH_TOT_TRADED_QTY) /
        parseFloat(current.FH_MARKET_LOT);
      const previousContracts =
        parseFloat(previous.FH_TOT_TRADED_QTY) /
        parseFloat(previous.FH_MARKET_LOT);
      const changeInOI = parseFloat(current.FH_CHANGE_IN_OI);

      if (currentContracts > 1.5 * previousContracts && changeInOI > 0) {
        occurrences.push({
          date: current.FH_TIMESTAMP,
          previousDate: previous.FH_TIMESTAMP,
          currentContracts,
          previousContracts,
          changeInOI,
        });
      }
    }

    return occurrences; // Return all occurrences
  };

  public formatDate = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
}
