import "server-only";
import { AppwriteException, type Models, type TablesDB } from "node-appwrite";

export async function getRowOrNull<Row extends Models.DefaultRow = Models.DefaultRow>(
  tablesDB: TablesDB,
  databaseId: string,
  tableId: string,
  rowId: string,
): Promise<Row | null> {
  try {
    return await tablesDB.getRow<Row>(databaseId, tableId, rowId);
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 404) return null;
    throw err;
  }
}
