import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlierUploaderProps {
  onFileChange: (file: File) => void;
  className?: string;
}

const FlierUploader = ({ onFileChange, className }: FlierUploaderProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
    
    // Pass file to parent component
    onFileChange(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-glass-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <p className="font-medium text-foreground">Upload Event Flier</p>
            <p className="text-sm text-muted-foreground">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats: JPG, PNG, GIF (Max 5MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img 
            src={preview} 
            alt="Event flier preview" 
            className="w-full h-auto rounded-2xl object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default FlierUploader;