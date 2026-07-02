import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config(); // Load environment variables from .env file

async function testDbConnection() {
  console.log('--- Starting Direct MySQL Connection Tests ---');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment variables.');
    return;
  }

  let connection: mysql.Connection | undefined;
  try {
    console.log('Attempting to connect to database...');
    connection = await mysql.createConnection(databaseUrl);
    console.log('✅ Successfully connected to the database.');

    // Test 1: Simple SELECT 1 query
    console.log('\n--- Test 1: SELECT 1 ---');
    try {
      const [rows] = await connection.execute('SELECT 1;');
      console.log('✅ SELECT 1 successful:', rows);
    } catch (error: any) {
      console.error('❌ SELECT 1 failed:', {
        message: error.message,
        errno: error.errno,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack,
      });
    }

    // Test 2: SELECT * FROM users LIMIT 1
    console.log('\n--- Test 2: SELECT * FROM users LIMIT 1 ---');
    try {
      const [rows] = await connection.execute('SELECT * FROM users LIMIT 1;');
      console.log('✅ SELECT * FROM users LIMIT 1 successful. Result:', rows);
    } catch (error: any) {
      console.error('❌ SELECT * FROM users LIMIT 1 failed:', {
        message: error.message,
        errno: error.errno,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        sql: error.sql,
        stack: error.stack,
      });
    }

  } catch (error: any) {
    console.error('❌ Database connection failed:', {
      message: error.message,
      errno: error.errno,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql,
      stack: error.stack,
    });
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDisconnected from the database.');
    }
  }
}

testDbConnection();
