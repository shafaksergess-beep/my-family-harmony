import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X, Check, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import imageCompression from 'browser-image-compression';

interface ReceiptScannerProps {
  onReceiptCaptured: (imageData: string, file: File) => void;
  onClose?: () => void;
}

export function ReceiptScanner({ onReceiptCaptured, onClose }: ReceiptScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera for receipts
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        haptics.light();
      }
    } catch (error) {
      console.error("Camera access error:", error);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please allow camera access to scan receipts",
      });
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    haptics.success();
    
    // Stop camera after capture
    stopCamera();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select an image file",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setCapturedImage(imageData);
      haptics.light();
    };
    reader.readAsDataURL(file);
  };

  const confirmReceipt = async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    haptics.medium();

    try {
      // Convert base64 to blob/file
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Compression options
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };

      const compressedFile = await imageCompression(blob as File, options);

      // Call the callback with captured data and compressed file
      onReceiptCaptured(capturedImage, compressedFile);
      
      toast({
        title: "Receipt Captured",
        description: "Your payment receipt has been saved (compressed)",
      });
      haptics.success();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process receipt",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    haptics.light();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Scan Payment Receipt
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View / Captured Image */}
        <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured receipt"
              className="w-full h-full object-cover"
            />
          ) : cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No image captured</p>
            </div>
          )}

          {/* Camera overlay guides */}
          {cameraActive && !capturedImage && (
            <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-lg pointer-events-none">
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Action Buttons */}
        <div className="flex gap-2">
          {capturedImage ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={retakePhoto}
                disabled={isProcessing}
              >
                <Camera className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button
                className="flex-1"
                onClick={confirmReceipt}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm
              </Button>
            </>
          ) : cameraActive ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={stopCamera}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={capturePhoto}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                className="flex-1"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </>
          )}
        </div>

        {/* Tips */}
        <p className="text-xs text-muted-foreground text-center">
          Position the receipt within the frame for best results
        </p>
      </CardContent>
    </Card>
  );
}
