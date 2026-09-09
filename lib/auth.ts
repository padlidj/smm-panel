import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
          || req?.headers?.['x-real-ip']
          || req?.headers?.['host']?.split(':')[0]
          || '0.0.0.0';
        const ua = req?.headers?.['user-agent'] || '';

        // Try admin first
        const admin = await prisma.admin.findUnique({ where: { username: credentials.username } });
        if (admin && admin.status) {
          const valid = await bcrypt.compare(credentials.password, admin.password);
          if (valid) {
            await prisma.loginLog.create({
              data: { username: admin.username, type: 'ADMIN', ip_address: ip, user_agent: ua, status: 'SUCCESS' },
            });
            return { id: String(admin.id), name: admin.username, email: admin.email, role: 'admin', level: admin.level };
          }
          await prisma.loginLog.create({ data: { username: admin.username, type: 'ADMIN', ip_address: ip, user_agent: ua, status: 'FAILED' } }).catch(() => {});
        }

        // Then user
        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        if (!user || user.status === 'BANNED') {
          await prisma.loginLog.create({ data: { username: credentials.username, type: 'USER', ip_address: ip, user_agent: ua, status: 'FAILED' } }).catch(() => {});
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) {
          await prisma.loginLog.create({ data: { user_id: user.id, username: user.username, type: 'USER', ip_address: ip, user_agent: ua, status: 'FAILED' } }).catch(() => {});
          return null;
        }
        if (user.status === 'UNVERIFIED') {
          await prisma.loginLog.create({ data: { user_id: user.id, username: user.username, type: 'USER', ip_address: ip, user_agent: ua, status: 'FAILED' } }).catch(() => {});
          throw new Error('Akun belum diaktivasi. Cek email Anda.');
        }

        // ponytail: no location lookup. Add geoip when needed.
        await prisma.loginLog.create({
          data: { user_id: user.id, username: user.username, type: 'USER', ip_address: ip, user_agent: ua, status: 'SUCCESS' },
        });

        return { id: String(user.id), name: user.username, email: user.email, role: 'user', balance: Number(user.balance) };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.level = (user as any).level;
        token.balance = (user as any).balance;
      }
      const id = Number(token.id);
      try {
        if (Number.isSafeInteger(id) && id > 0 && token.role === 'admin') {
          const admin = await prisma.admin.findUnique({ where: { id }, select: { status: true, level: true } });
          if (admin?.status) {
            token.level = admin.level;
            delete token.balance;
            return token;
          }
        } else if (Number.isSafeInteger(id) && id > 0 && token.role === 'user') {
          const account = await prisma.user.findUnique({ where: { id }, select: { status: true, balance: true } });
          if (account?.status === 'ACTIVE') {
            delete token.level;
            token.balance = Number(account.balance);
            return token;
          }
        }
      } catch { /* DB unavailable: revoke authority, never trust stale claims. */ }
      for (const key of ['id', 'role', 'level', 'balance', 'sub', 'name', 'email', 'picture']) delete token[key];
      return token;
    },
    async session({ session, token }) {
      // NextAuth v4 getServerSession maps an empty body to null (not a truthy user-less session).
      if (!token.id || (token.role !== 'user' && token.role !== 'admin')) return {} as typeof session;
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).level = token.level;
        (session.user as any).balance = token.balance;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};