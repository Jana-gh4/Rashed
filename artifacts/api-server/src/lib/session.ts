import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";

const PgSession = connectPgSimple(session);

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set");
}

// Replit serves the app through an HTTPS proxy embedded in an iframe on replit.com.
// That means the browser sees the app as cross-site relative to replit.com, so
// SameSite=Lax/Strict cookies are blocked. We must use SameSite=None; Secure.
// trust proxy (set in app.ts) ensures Express sees the connection as HTTPS via
// the X-Forwarded-Proto header from the Replit proxy.
export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: false, // table is created manually in seed/migration
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,          // required for SameSite=None
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: "none",      // allow cookie in cross-site iframe (Replit webview)
  },
});

// Augment express-session types
declare module "express-session" {
  interface SessionData {
    userId: number;
    householdId?: number;
  }
}
