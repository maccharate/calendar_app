import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// 管理者のDiscord ID
const ADMIN_USER_IDS = [
  "547775428526473217",
  "549913811172196362",
  "501024205916078083",
  "642197951216746528"
];

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      // 初回ログイン時に管理者フラグを設定
      if (account && profile) {
        const userId = profile.id || token.sub;
        token.isAdmin = ADMIN_USER_IDS.includes(userId);
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.sub; // DiscordユーザーIDをセッションに追加
      session.user.isAdmin = token.isAdmin; // 管理者フラグを追加
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
