import { useState, useRef, useEffect } from 'react';
import { imageRenamerAPI, WebsiteData, UploadedImage, RenamedImage } from '../api/imageRenamer';
import { Upload, X, Download, RefreshCw, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ImageRenamer() {
  const [url, setUrl] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [renamedImages, setRenamedImages] = useState<RenamedImage[]>([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (sessionId) {
        imageRenamerAPI.cleanup(sessionId);
      }
    };
  }, [sessionId]);

  const handleAnalyze = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await imageRenamerAPI.analyze(url);
      setSessionId(result.sessionId);
      setWebsiteData(result);
      
      if (result.rooms && result.rooms.length > 0) {
        setStep(2);
      } else {
        setError('Could not find room/event information. Try a different URL or continue without it.');
        setStep(2);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const result = await imageRenamerAPI.upload(sessionId!, files);
      
      const newImages: UploadedImage[] = result.files.map((f, idx) => ({
        id: Math.random().toString(36).substr(2, 9),
        originalName: f.originalName,
        savedName: f.savedName,
        path: f.path,
        type: f.type,
        preview: URL.createObjectURL(files[idx])
      }));
      
      setImages(prev => [...prev, ...newImages]);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async () => {
    if (images.length === 0 || !websiteData) return;

    setProcessing(true);
    setError(null);

    try {
      const imageData = images.map(img => ({
        originalName: img.originalName,
        savedName: img.savedName,
        path: img.path,
        type: img.type
      }));

      const result = await imageRenamerAPI.rename(imageData, websiteData);
      
      setRenamedImages(result.results.map((r, idx) => ({
        ...images[idx],
        suggestedName: r.suggestedName,
        extension: r.extension
      })));
      
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      const files = renamedImages.map(img => ({
        savedName: img.savedName,
        suggestedName: img.suggestedName,
        extension: img.extension
      }));

      await imageRenamerAPI.download(sessionId!, files);
      
      setTimeout(() => {
        imageRenamerAPI.cleanup(sessionId!);
        setSessionId(null);
        resetForm();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const resetForm = () => {
    setUrl('');
    setSessionId(null);
    setWebsiteData(null);
    setImages([]);
    setRenamedImages([]);
    setStep(1);
    setError(null);
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const updateName = (id: string, newName: string) => {
    setRenamedImages(prev => 
      prev.map(img => img.id === id ? { ...img, suggestedName: newName } : img)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🖼️ Image Renamer</h1>
          <p className="text-muted-foreground">Rename images based on website room/event data</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</span>
              Enter Website URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step >= 1 && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/venue"
                    disabled={analyzing || step > 1}
                  />
                  <Button onClick={handleAnalyze} disabled={analyzing || !url}>
                    {analyzing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>

                {websiteData && websiteData.rooms && websiteData.rooms.length > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-medium mb-2 text-primary">Found {websiteData.rooms.length} rooms/spaces:</h3>
                    <div className="flex flex-wrap gap-2">
                      {websiteData.rooms.slice(0, 15).map((room, idx) => (
                        <Badge key={idx} variant="secondary">
                          {room.name}
                        </Badge>
                      ))}
                      {websiteData.rooms.length > 15 && (
                        <span className="text-muted-foreground text-sm">
                          +{websiteData.rooms.length - 15} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
              Upload Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step >= 2 && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary rounded-xl p-8 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Upload className="mx-auto mb-4 text-muted-foreground h-12 w-12" />
                  <p className="text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">JPG, PNG, WEBP up to 10MB each</p>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt={img.originalName}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(img.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{img.originalName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</span>
              AI Analysis & Rename
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step >= 3 && (
              <Button
                onClick={handleRename}
                disabled={processing || images.length === 0}
                className="w-full"
              >
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Analyze & Suggest Names
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {step >= 4 && renamedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-primary text-primary-foreground">4</span>
                Review & Download
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {renamedImages.map(img => (
                  <div key={img.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                    <img
                      src={img.preview}
                      alt={img.originalName}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{img.originalName}</p>
                      <Input
                        value={img.suggestedName}
                        onChange={(e) => updateName(img.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <span className="text-muted-foreground">.{img.extension}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleDownload}
                className="w-full"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Renamed Images (ZIP)
              </Button>

              <Button
                onClick={resetForm}
                variant="outline"
                className="w-full"
              >
                Start Over
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-center gap-2 mt-8">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`w-3 h-3 rounded-full ${step >= s ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
}
