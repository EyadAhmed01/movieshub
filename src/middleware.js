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
  matcher: ["/", "/login", "/signup", "/api/movies/:path*", "/api/series/:path*", "/api/tmdb/:path*"],
};
