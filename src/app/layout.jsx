import { DM_Sans, JetBrains_Mono, Libre_Baskerville } from "next/font/google";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700"],
});

export const metadata = {
  title: "Rotten Potatoes",
  description: "Track movies and series with ratings and TMDB info",
  applicationName: "Rotten Potatoes",
  appleWebApp: {
    capable: true,
    title: "Rotten Potatoes",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/assets/logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/assets/logo.svg", type: "image/svg+xml" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a20",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${libreBaskerville.variable}`}
    >
      <body className="app-body">
        <ServiceWorkerRegister />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
