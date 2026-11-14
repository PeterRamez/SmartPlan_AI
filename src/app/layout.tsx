import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"LegalMind AI", description:"Multilingual legal research grounded in your legal knowledge base." };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
