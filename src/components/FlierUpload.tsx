import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedUploadIcon = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y = time * 0.5;
    meshRef.current.position.y = Math.sin(time * 2) * 0.1;
  });

  return (
    <Box ref={meshRef} args={[1, 1, 0.1]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color="#0ea5e9" 
        transparent 
        opacity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </Box>
  );
};

interface FlierUploadProps {
  trigger: React.ReactNode;
  onUpload?: (file: File, eventData: any) => void;
}

const FlierUpload = ({ trigger, onUpload }: FlierUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    price: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      
      // Mock OCR/AI extraction (in real app, this would call an AI service)
      setTimeout(() => {
        setExtractedData({
          title: 'Jazz Night Live',
          date: '2025-08-15',
          time: '21:00',
          location: 'Blue Note Jazz Club',
          price: '65'
        });
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const handleSubmit = () => {
    if (selectedFile && onUpload) {
      onUpload(selectedFile, extractedData);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedData({
      title: '',
      date: '',
      time: '',
      location: '',
      price: ''
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="glass-card border-glass-border max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">Upload Event Flier</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={cn(
                "border-2 border-dashed border-glass-border rounded-lg p-8",
                "glass-card hover:border-primary/50 transition-colors cursor-pointer",
                "flex flex-col items-center text-center space-y-4"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Three.js animated upload icon */}
              <div className="w-16 h-16">
                <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
                  <ambientLight intensity={0.4} />
                  <directionalLight position={[2, 2, 2]} intensity={1} />
                  <AnimatedUploadIcon />
                </Canvas>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Drop your event flier here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Or click to browse files
                </p>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <img
                  src={preview!}
                  alt="Flier preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Extracted Data */}
              <div className="space-y-4">
                <Label className="text-foreground">Extracted Information</Label>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="extracted-title" className="text-sm">Title</Label>
                    <Input
                      id="extracted-title"
                      value={extractedData.title}
                      onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                      className="glass-card border-glass-border bg-glass/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extracted-location" className="text-sm">Location</Label>
                    <Input
                      id="extracted-location"
                      value={extractedData.location}
                      onChange={(e) => setExtractedData({...extractedData, location: e.target.value})}
                      className="glass-card border-glass-border bg-glass/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extracted-date" className="text-sm">Date</Label>
                    <Input
                      id="extracted-date"
                      type="date"
                      value={extractedData.date}
                      onChange={(e) => setExtractedData({...extractedData, date: e.target.value})}
                      className="glass-card border-glass-border bg-glass/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extracted-time" className="text-sm">Time</Label>
                    <Input
                      id="extracted-time"
                      type="time"
                      value={extractedData.time}
                      onChange={(e) => setExtractedData({...extractedData, time: e.target.value})}
                      className="glass-card border-glass-border bg-glass/20"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="extracted-price" className="text-sm">Price ($)</Label>
                  <Input
                    id="extracted-price"
                    type="number"
                    value={extractedData.price}
                    onChange={(e) => setExtractedData({...extractedData, price: e.target.value})}
                    className="glass-card border-glass-border bg-glass/20"
                  />
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          {selectedFile && (
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={removeFile}>
                Cancel
              </Button>
              <Button variant="glow" className="flex-1" onClick={handleSubmit}>
                Create Event from Flier
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlierUpload;