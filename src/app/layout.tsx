import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"Alex — Legal Consultation", description:"Multilingual, source-grounded legal information with Alex." };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
