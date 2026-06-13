import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPermissionsAndRoles } from "@/lib/permissions";

const ONE_DAY_SECONDS = 24 * 60 * 60;

function normalizeCredential(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/\s+/g, "");
}

async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isConnectionError =
        error.message?.includes("Can't reach database server") ||
        error.message?.includes("PrismaClientInitializationError") ||
        error.message?.includes("P1001") ||
        error.message?.includes("P1003") ||
        error.message?.includes("timeout") ||
        String(error).includes("Can't reach database server") ||
        String(error).includes("InitializationError");
      
      if (!isConnectionError) {
        throw error;
      }
      
      console.warn(`[DB Retry] Connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function buildSessionUser(userId: string) {
  let user;
  let locations;
  try {
    [user, locations] = await withDbRetry(() =>
      Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            location: true,
            roleRecord: { include: { permissions: { include: { permission: true } } } },
            permissions: { include: { permission: true } },
          },
        }),
        prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      ])
    );
  } catch (error) {
    console.error("Unable to refresh session user from database after retries:", error);
    return null;
  }


  if (!user || !user.isActive) return null;

  const isAdmin = user.role === "ADMIN";
  const roleName = isAdmin ? "Super Admin" : user.roleRecord?.name || user.role || "Sales";
  
  let assignedLocations: string[] = [];
  if (isAdmin) {
    assignedLocations = locations.map((location) => location.id);
  } else if ((user as any).assignedLocationIds) {
    assignedLocations = (user as any).assignedLocationIds.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  
  if (assignedLocations.length === 0 && user.locationId) {
    assignedLocations = [user.locationId];
  }

  const allPermissions = isAdmin ? await prisma.permission.findMany({ select: { key: true } }).catch(() => []) : [];
  const rolePermissions = user.roleRecord?.permissions.map((entry) => entry.permission.key) || [];
  const userPermissions = user.permissions.map((entry) => entry.permission.key);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    phone: user.phone || "",
    role: roleName,
    roleId: user.roleId || "",
    permissions: isAdmin ? allPermissions.map((permission) => permission.key) : Array.from(new Set([...rolePermissions, ...userPermissions])),
    assignedLocations,
    locationId: user.locationId,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: ONE_DAY_SECONDS },
  jwt: { maxAge: ONE_DAY_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await withDbRetry(() => ensureDefaultPermissionsAndRoles()).catch((e) => {
          console.error("Non-fatal error running ensureDefaultPermissionsAndRoles on auth:", e);
        });

        const identifier = normalizeCredential(credentials?.identifier);
        const phoneIdentifier = normalizePhone(credentials?.identifier);
        const password = String(credentials?.password || "");

        if (!identifier || !password) return null;

        const users = await withDbRetry(() =>
          prisma.user.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          })
        );
        const user = users.find(
          (entry) => normalizeCredential(entry.username) === identifier || normalizePhone(entry.phone) === phoneIdentifier,
        );

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;

        const sessionUser = await buildSessionUser(user.id);
        if (!sessionUser) return null;

        return {
          id: sessionUser.id,
          name: `${sessionUser.firstName} ${sessionUser.lastName}`,
          email: sessionUser.username,
          ...sessionUser,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.user = user;
        (token as any).lastRefreshed = Date.now();
      }

      if (token.user?.id) {
        const now = Date.now();
        const lastRefreshed = (token as any).lastRefreshed || 0;
        const needsRefresh = now - lastRefreshed > 30000; // 30 seconds cache window

        if (needsRefresh || trigger === "update") {
          const freshUser = await buildSessionUser(String(token.user.id));
          if (freshUser) {
            token.user = { ...token.user, ...freshUser };
            (token as any).lastRefreshed = now;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user = token.user as any;
      return session;
    },
  },
};

export async function getCurrentUser() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  return (session?.user as any) || null;
}
