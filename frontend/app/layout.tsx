import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
} from "next/font/google";

import "./globals.css";

import AppLayout from "./Components/AppLayout";

import { AuthProvider } from "./Context/AuthContext";
import { SocketProvider } from "./Context/SocketContext";

const geistSans = Geist({
  variable:
    "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono =
  Geist_Mono({
    variable:
      "--font-geist-mono",
    subsets: ["latin"],
  });

export const metadata: Metadata =
  {
    title: "Blogie",

    description:
      "A modern writing platform",
  };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
<<<<<<< HEAD

          <SocketProvider>

            <AppLayout>
              {children}
            </AppLayout>

          </SocketProvider>

=======
          <AppLayout>
            <Notification />
            {children}
          </AppLayout>
>>>>>>> 7d0f1f8dd944450432ae88c085b4c1ef171b419b
        </AuthProvider>
      </body>
    </html>
  );
}