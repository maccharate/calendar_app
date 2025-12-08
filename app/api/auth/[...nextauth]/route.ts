// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { checkDiscordMembershipWithBot } from "@/lib/discordAuth";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    // ★ JWT コールバックでメンバー判定
    async jwt({ token, account }: any) {
      // 初回サインイン時だけチェック
      if (
        account &&
        account.provider === "discord" &&
        process.env.ENABLE_MEMBERSHIP_CHECK === "true"
      ) {
        try {
          // token.sub = Discord の userId
          const userId = token.sub as string;

          const { isMember, hasRequiredRole, roles } =
            await checkDiscordMembershipWithBot(userId);

          token.isMember = isMember;
          token.hasRequiredRole = hasRequiredRole;
          token.roles = roles;
        } catch (e) {
          console.error("membership check failed", e);
          token.isMember = false;
          token.hasRequiredRole = false;
        }
      }

      return token;
    },

    // セッションにも載せておく（必要なら）
    async session({ session, token }: any) {
      session.user.id = token.sub;
      session.user.isMember = token.isMember ?? true;
      session.user.hasRequiredRole = token.hasRequiredRole ?? true;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
