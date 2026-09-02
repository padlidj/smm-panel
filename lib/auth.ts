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
        }

        // Then user
        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        if (!user || user.status === 'BANNED') return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

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
      return token;
    },
    async session({ session, token }) {
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