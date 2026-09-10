import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mom Good",
  description: "Thoughtful print-on-demand goods for real family life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="siteHeader">
          <a className="brand" href="/">Mom Good</a>
          <nav>
            <a href="/shop">Shop</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
