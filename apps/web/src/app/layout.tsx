import React from "react";
import type { Metadata } from "next";
import { AuthProvider } from "../context/AuthContext";
import { CircleProvider } from "../context/CircleContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "FetchLocation",
  description: "Live location sharing for your circle, self-hosted and private.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CircleProvider>{children}</CircleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
