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
    // ★ Discord メンバー判定 → JWT に保存
    async jwt({ token, account }: any) {
      // 初回サインイン時だけ Discord の情報が入ってくる
      if (account && account.provider === "discord") {
        const userId = token.sub as string; // or account.providerAccountId

        if (process.env.ENABLE_MEMBERSHIP_CHECK === "true") {
          try {
            const { isMember, hasRequiredRole, roles } =
              await checkDiscordMembershipWithBot(userId);

            token.isMember = isMember;
            token.hasRequiredRole = hasRequiredRole;
            token.roles = roles;
          } catch (e) {
            console.error("membership check failed", e);
            // 失敗したら弾く運用にする場合
            token.isMember = false;
            token.hasRequiredRole = false;
          }
        } else {
          // チェックOFFなら全員OK扱い
          token.isMember = true;
          token.hasRequiredRole = true;
        }
      }

      return token;
    },

    // ★ セッションにも結果を載せておく（必要なら）
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
