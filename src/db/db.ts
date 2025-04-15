import db from "../config/postgres";
import { IProcessedData, ISymbolRawData } from "../types";

export default class NSEDb {
  public insertSymbolRawDataDb = async (obj: ISymbolRawData[]) => {
    const query = db.format(
      `INSERT INTO symbol_raw_data ? ON CONFLICT ON CONSTRAINT unique_symbol_raw_data DO NOTHING`,
      obj
    );
    return db.query(query);
  };

  public insertProcessedDataDb = async (obj: IProcessedData[]) => {
    const query = db.format(
      `INSERT INTO processed_data ? ON CONFLICT ON CONSTRAINT unique_processed_data DO NOTHING`,
      obj
    );
    await db.query(query);
  };
}
