import "./globals.css";

import type {
  Metadata,
} from "next";

import {
  Inter,
} from "next/font/google";

import AppHeader from "../components/navigation/AppHeader";


const inter = Inter({
  subsets: [
    "latin",
  ],

  display:
    "swap",
});


export const metadata: Metadata = {

  title:
    "Myriad Autism Journey",

  description:
    "Personalized autism guidance, trusted resources, and a step-by-step roadmap for families.",

  keywords: [
    "autism",
    "autism resources",
    "early intervention",
    "IEP",
    "therapy",
    "family roadmap",
    "autism navigator",
    "Myriad Autism Journey",
  ],

};


export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {

  return (

    <html
      lang="en"
    >

      <body
        className={
          inter.className
        }
      >

        <AppHeader />

        {children}

      </body>

    </html>

  );

}