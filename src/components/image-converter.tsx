"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Upload, Download, FileArchive, Loader2, FileImage, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageFile {
  id: string;
  originalFile: File;
  originalSize: number;
  originalPreviewUrl: string;
  convertedBlob?: Blob;
  convertedSize?: number;
  convertedPreviewUrl?: string;
  isConverting: boolean;
  error?: string;
  isLarger?: boolean;
}

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const SUPPORTED_FORMATS = ['JPG', 'PNG', 'GIF', 'BMP', 'TIFF', 'AVIF'];
const ACCEPTED_MIMETYPES = "image/jpeg,image/png,image/gif,image/bmp,image/tiff,image/avif";

export function ImageConverter() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null;
    if ('dataTransfer' in event) {
      files = event.dataTransfer.files;
    } else {
      files = event.target.files;
    }

    if (files) {
      processFiles(Array.from(files));
    }
  }, []);

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const id = `${file.name}-${file.lastModified}-${file.size}`;
      if (images.some(img => img.id === id)) return; // Avoid duplicates

      const newImage: ImageFile = {
        id,
        originalFile: file,
        originalSize: file.size,
        originalPreviewUrl: URL.createObjectURL(file),
        isConverting: true,
      };

      setImages(prev => [...prev, newImage]);
      convertFileToWebP(file)
        .then(convertedBlob => {
          const isLarger = convertedBlob.size > file.size;
          if (isLarger) {
            toast({
                variant: 'default',
                title: "Conversion not optimal",
                description: `${file.name} is larger after conversion. Original will be used.`
            });
          }
          setImages(prev => prev.map(img => img.id === id ? {
            ...img,
            isConverting: false,
            convertedBlob,
            convertedSize: convertedBlob.size,
            convertedPreviewUrl: URL.createObjectURL(convertedBlob),
            isLarger: isLarger,
          } : img));
        })
        .catch(error => {
          console.error("Conversion error:", error);
          setImages(prev => prev.map(img => img.id === id ? {
            ...img,
            isConverting: false,
            error: `Failed to convert. Browser may not support this format.`
          } : img));
        });
    });
  };
  
  const convertFileToWebP = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Could not get canvas context.'));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob returned null.'));
          }, 'image/webp', 0.85);
        };
        img.onerror = () => reject(new Error('Image could not be loaded.'));
      };
      reader.onerror = () => reject(new Error('File could not be read.'));
    });
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelect(event);
  }, [handleFileSelect]);

  const handleDownloadAll = async () => {
    const convertedImages = images.filter(img => img.convertedBlob || img.isLarger);
    if (convertedImages.length === 0) {
        toast({ variant: "destructive", title: "No images to download", description: "Please convert some images first."});
        return;
    }
    
    setIsZipping(true);
    try {
        const zip = new JSZip();
        convertedImages.forEach(img => {
            const originalFilename = img.originalFile.name.substring(0, img.originalFile.name.lastIndexOf('.'));
            if(img.isLarger) {
                zip.file(img.originalFile.name, img.originalFile);
            } else {
                zip.file(`${originalFilename}.webp`, img.convertedBlob!);
            }
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'WebP_Speedy_Images.zip');
    } catch (error) {
        console.error("Zipping error:", error);
        toast({ variant: "destructive", title: "Error creating ZIP", description: "Could not create the ZIP file."});
    } finally {
        setIsZipping(false);
    }
  };

  const handleDownloadSingle = (image: ImageFile) => {
    if (image.isLarger) {
        saveAs(image.originalFile, image.originalFile.name);
    } else if (image.convertedBlob) {
        const originalFilename = image.originalFile.name.substring(0, image.originalFile.name.lastIndexOf('.'));
        saveAs(image.convertedBlob, `${originalFilename}.webp`);
    }
  };

  useEffect(() => {
    return () => {
      images.forEach(image => {
        URL.revokeObjectURL(image.originalPreviewUrl);
        if (image.convertedPreviewUrl) {
          URL.revokeObjectURL(image.convertedPreviewUrl);
        }
      });
    };
  }, [images]);

  return (
    <div className="w-full max-w-4xl">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-4 text-primary" />
              <p className="mb-2 text-lg font-semibold text-foreground">
                Drop your images here
              </p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_MIMETYPES} className="hidden" onChange={handleFileSelect} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {SUPPORTED_FORMATS.map(format => (
                  <Badge key={format} variant="secondary">{format}</Badge>
              ))}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">* We are still experimenting with AVIF to WebP compression.</p>
        </CardContent>
      </Card>
      
      {images.length > 0 && (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-foreground">Conversion Results</h2>
                <Button onClick={handleDownloadAll} disabled={isZipping || images.some(i => i.isConverting)}>
                    {isZipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                    Download All
                </Button>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map(image => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-4 grid grid-cols-2 gap-4 items-center">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold truncate text-foreground">Original</h3>
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                        <Image src={image.originalPreviewUrl} alt="Original" width={160} height={90} className="max-h-full max-w-full object-contain rounded-md" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{image.originalFile.name}</p>
                    <p className="text-xs font-medium text-foreground">{formatBytes(image.originalSize)}</p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">{image.isLarger ? 'Original (Optimal)' : 'WebP'}</h3>
                    <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                      {image.isConverting && <Loader2 className="w-8 h-8 text-primary animate-spin" />}
                      {image.error && <AlertCircle className="w-8 h-8 text-destructive" />}
                      {image.isLarger && <Image src={image.originalPreviewUrl} alt="Original because it is smaller" width={160} height={90} className="max-h-full max-w-full object-contain rounded-md" />}
                      {image.convertedPreviewUrl && !image.isLarger && <Image src={image.convertedPreviewUrl} alt="Converted" width={160} height={90} className="max-h-full max-w-full object-contain rounded-md" />}
                    </div>
                    {image.error ? (
                        <p className="text-xs text-destructive">{image.error}</p>
                    ) : image.convertedSize !== undefined ? (
                        <>
                           {image.isLarger ? (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(image.originalSize)}
                                        <span className="ml-2 text-blue-400 font-bold">
                                            (Optimal)
                                        </span>
                                    </p>
                                    <Button size="sm" className="w-full" onClick={() => handleDownloadSingle(image)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />
                                      Download Original
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(image.convertedSize)}
                                        {image.convertedSize < image.originalSize && (
                                            <span className="ml-2 text-green-400 font-bold">
                                                (-{(((image.originalSize - image.convertedSize) / image.originalSize) * 100).toFixed(0)}%)
                                            </span>
                                        )}
                                    </p>
                                    <Button size="sm" className="w-full" onClick={() => handleDownloadSingle(image)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">Converting...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
