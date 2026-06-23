import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenLoop",
  description: "fuck splice smh",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex antialiased h-screen w-screen overflow-x-hidden dark">
        <Header />
        <Sidebar />
        <main className="flex absolute right-0 sm:w-4/5 w-full transition-all">{children}</main>
      </body>
    </html>
  );
}
