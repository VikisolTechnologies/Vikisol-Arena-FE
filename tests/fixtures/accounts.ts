/**
 * The five seeded demo accounts this app already ships for exactly this purpose - see
 * TEST-LOGINS.md for what each one has pre-seeded. Credentials come from .env.test only; nothing
 * here is a literal secret (see .env.test.example for the expected variable names).
 */

export type ArenaRole = "talent" | "company_admin" | "recruiter" | "hiring_manager" | "platform_admin";

export interface DemoAccount {
  role: ArenaRole;
  email: string;
  password: string;
  /** The visible label on /auth's role-picker button for this account (see src/app/auth/page.tsx). */
  roleButtonLabel: string;
  /** Where signIn()'s redirectForRole() sends this role - see src/app/auth/page.tsx. */
  expectedLandingPath: string;
  /** storageState file this account's setup project writes to / other specs read from. */
  storageStatePath: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.test.example to .env.test and fill in real values - see TEST-LOGINS.md for the actual demo-account credentials.`,
    );
  }
  return value;
}

export const DEMO_ACCOUNTS: Record<ArenaRole, DemoAccount> = {
  talent: {
    role: "talent",
    email: requireEnv("ARENA_TALENT_EMAIL"),
    password: requireEnv("ARENA_TALENT_PASSWORD"),
    roleButtonLabel: "Talent",
    expectedLandingPath: "/home",
    storageStatePath: "playwright/.auth/talent.json",
  },
  company_admin: {
    role: "company_admin",
    email: requireEnv("ARENA_COMPANY_ADMIN_EMAIL"),
    password: requireEnv("ARENA_COMPANY_ADMIN_PASSWORD"),
    roleButtonLabel: "Enterprise",
    expectedLandingPath: "/enterprise/admin",
    storageStatePath: "playwright/.auth/company_admin.json",
  },
  recruiter: {
    role: "recruiter",
    email: requireEnv("ARENA_RECRUITER_EMAIL"),
    password: requireEnv("ARENA_RECRUITER_PASSWORD"),
    roleButtonLabel: "Recruiter",
    expectedLandingPath: "/enterprise",
    storageStatePath: "playwright/.auth/recruiter.json",
  },
  hiring_manager: {
    role: "hiring_manager",
    email: requireEnv("ARENA_HIRING_MANAGER_EMAIL"),
    password: requireEnv("ARENA_HIRING_MANAGER_PASSWORD"),
    roleButtonLabel: "Hiring manager",
    expectedLandingPath: "/enterprise/interviews/mine",
    storageStatePath: "playwright/.auth/hiring_manager.json",
  },
  platform_admin: {
    role: "platform_admin",
    email: requireEnv("ARENA_PLATFORM_ADMIN_EMAIL"),
    password: requireEnv("ARENA_PLATFORM_ADMIN_PASSWORD"),
    roleButtonLabel: "Platform admin",
    expectedLandingPath: "/admin",
    storageStatePath: "playwright/.auth/platform_admin.json",
  },
};
