import type { Metadata } from "next";
import { Geist_Mono, Inter, Lora } from "next/font/google";
import { LabShell } from "@/components/lab-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const loraHeading = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "From LLM API to Coding Agent",
  description: "Tutorial: from an LLM API call to a coding agent. Completions, conversation history, tools, and a loop.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased font-sans",
        inter.variable,
        loraHeading.variable,
        fontMono.variable
      )}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <LabShell>{children}</LabShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
