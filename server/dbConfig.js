import { createPool } from 'promise-mysql2';
import { config } from 'dotenv';

config({ path: './env.default' });

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    authPlugins: {
      mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
    },
    insecureAuth: false
  };
  
  const pool = createPool(dbConfig);
  
  export default pool;