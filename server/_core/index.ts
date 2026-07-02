import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
// REMOVED: OAuth routes (Manus authentication removed in Phase 1)
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serveStatic";
import mysql from "mysql2/promise";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, "0.0.0.0", () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS with support for credentials and specific requesting origin
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Cookie, X-Requested-With"
    );

    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Dedicated health check endpoint
  app.get("/health", async (_req, res) => {
    let dbStatus = "unknown";
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (db) {
        // Try a simple query
        await db.execute("SELECT 1");
        dbStatus = "connected";
      } else {
        dbStatus = "no_url";
      }
    } catch (err: any) {
      dbStatus = "error: " + err.message;
    }
    
    res.status(dbStatus === "connected" ? 200 : 500).json({ 
      status: dbStatus === "connected" ? "ok" : "error", 
      database: dbStatus,
      timestamp: Date.now() 
    });
  });

  // Temporary DB test endpoint
  app.get("/db-test", async (_req, res) => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return res.status(500).json({ error: "DATABASE_URL is not set." });
    }

    let connection: mysql.Connection | undefined;
    try {
      connection = await mysql.createConnection(databaseUrl);
      const results: any = {};

      // Test 1: SELECT 1
      try {
        const [rows] = await connection.execute("SELECT 1;");
        results.select1 = { status: "success", rows };
      } catch (error: any) {
        results.select1 = { 
          status: "failed", 
          error: {
            message: error.message,
            errno: error.errno,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            stack: error.stack,
          }
        };
      }

      // Test 2: SELECT * FROM users LIMIT 1
      try {
        const [rows] = await connection.execute("SELECT * FROM users LIMIT 1;");
        results.selectUsers = { status: "success", rows };
      } catch (error: any) {
        results.selectUsers = { 
          status: "failed", 
          error: {
            message: error.message,
            errno: error.errno,
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            sql: error.sql,
            stack: error.stack,
          }
        };
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({
        error: "Database connection or query failed",
        details: {
          message: error.message,
          errno: error.errno,
          code: error.code,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
          sql: error.sql,
          stack: error.stack,
        },
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  // REMOVED: OAuth routes registration (Manus removed in Phase 1)
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    // Dynamic import to prevent loading Vite and its config file in production
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = process.env.NODE_ENV === "production"
    ? preferredPort
    : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
