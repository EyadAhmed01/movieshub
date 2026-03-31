import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const p = req.nextUrl.pathname;
      if (p === "/login" || p === "/signup") return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/",
    "/analytics",
    "/what-to-watch",
    "/api/what-to-watch",
    "/login",
    "/signup",
    "/api/movies/:path*",
    "/api/series/:path*",
    "/api/tmdb/:path*",
    "/api/analytics",
    "/api/recommendations",
    "/api/chat",
    "/api/library/:path*",
    "/api/import/:path*",
    "/watchlist",
    "/api/watchlist/:path*",
  ],
};
