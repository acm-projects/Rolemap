import { Pool } from "pg";

// Creates a connection pool to AWS RDS Postgres.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for AWS RDS connections
  }
});

export default pool;