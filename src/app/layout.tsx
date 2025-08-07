import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'WebP Speedy | Convert Images to WebP',
  description: 'A fast, client-side image to WebP converter. Drag and drop your images to convert them to the modern WebP format instantly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <div className="fixed top-1/2 -right-[5.75rem] z-50 origin-center -translate-y-1/2 rotate-90">
          <a href="#" className="block bg-primary text-primary-foreground px-4 py-2 rounded-t-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg">
            Support WebP Speedy
          </a>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
