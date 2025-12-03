import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X, Loader2, QrCode, Flashlight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";
import { Html5Qrcode, Html5QrcodeScanType } from "html5-qrcode";

interface MobileQRScannerProps {
  onScan: (data: any) => void;
  onClose?: () => void;
  expectedMeetingId?: string;
}

export function MobileQRScanner({ onScan, onClose, expectedMeetingId }: MobileQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setIsScanning(true);
    haptics.light();

    try {
      const html5QrCode = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          haptics.success();
          await stopScanner();
          
          try {
            const data = JSON.parse(decodedText);
            
            // Validate if it's the expected meeting
            if (expectedMeetingId && data.meetingId !== expectedMeetingId) {
              haptics.warning();
              toast({
                title: "Wrong Meeting",
                description: "This QR code is for a different meeting",
                variant: "destructive",
              });
              // Restart scanner
              startScanner();
              return;
            }

            onScan(data);
          } catch (error) {
            haptics.error();
            toast({
              title: "Invalid QR Code",
              description: "Could not read the QR code",
              variant: "destructive",
            });
            startScanner();
          }
        },
        () => {
          // Ignore scan errors
        }
      );

      setHasPermission(true);
    } catch (error: any) {
      console.error("Scanner error:", error);
      setIsScanning(false);
      setHasPermission(false);
      
      toast({
        title: "Camera Error",
        description: error.message || "Could not access camera",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
  };

  const toggleTorch = async () => {
    // Note: Torch control requires additional implementation
    // This is a placeholder for native app integration
    setTorchOn(!torchOn);
    haptics.light();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner View */}
        <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
          <div id="qr-scanner-container" className="w-full h-full" />
          
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {hasPermission === false 
                  ? "Camera permission denied" 
                  : "Tap to start scanning"}
              </p>
            </div>
          )}

          {/* Scanner overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute inset-12">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
              
              {/* Scanning line animation */}
              <div className="absolute left-12 right-12 h-0.5 bg-primary animate-scan-line" 
                   style={{ top: '50%' }} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {isScanning ? (
            <>
              <Button variant="outline" className="flex-1" onClick={stopScanner}>
                <X className="h-4 w-4 mr-2" />
                Stop
              </Button>
              <Button variant="outline" size="icon" onClick={toggleTorch}>
                <Flashlight className={`h-4 w-4 ${torchOn ? "text-yellow-500" : ""}`} />
              </Button>
            </>
          ) : (
            <Button className="flex-1" onClick={startScanner}>
              <Camera className="h-4 w-4 mr-2" />
              Start Scanning
            </Button>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-muted-foreground text-center">
          Point your camera at the meeting QR code to check in
        </p>
      </CardContent>
    </Card>
  );
}
