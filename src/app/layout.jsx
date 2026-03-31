import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata = {
  title: "Viewing history",
  description: "Movies and series you watched — with ratings and TMDB info",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
