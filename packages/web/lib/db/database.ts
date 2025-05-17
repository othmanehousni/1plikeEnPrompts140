import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

// Use PGLite for local storage
const client = new PGlite();
export const db = drizzle(client, { schema });
export default db;
