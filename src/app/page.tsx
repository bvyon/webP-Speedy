import { ImageConverter } from '@/components/image-converter';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full px-4 py-8 sm:p-12">
      <div className="text-center mb-8 max-w-4xl mx-auto">
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">
          WebP Speedy
        </h1>
        <p className="font-body text-lg text-muted-foreground mt-4">
          Transform your images to WebP format for superior compression and faster websites.
        </p>
      </div>
      <ImageConverter />
    </main>
  );
}
