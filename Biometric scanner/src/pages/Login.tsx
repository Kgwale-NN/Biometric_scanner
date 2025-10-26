import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Scan, Shield, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { verifyFace, verifyPIN } from "@/services/api";

const Login = () => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<"face" | "fingerprint" | "pin" | null>(null);
  const [pin, setPin] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Could not access camera");
      setScanning(false);
      setAuthMethod(null);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(videoRef.current, 0, 0);
    return new Promise<Blob | null>(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.95);
    });
  }, []);

  const handleBiometricAuth = async (method: "face" | "fingerprint") => {
    setAuthMethod(method);
    setScanning(true);

    if (method === "face") {
      await startCamera();
      // Wait a bit for camera to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const frameBlob = await captureFrame();
        if (!frameBlob) {
          toast.error("Could not capture image");
          return;
        }

        const result = await verifyFace(frameBlob);
        if (result.status === "success") {
          toast.success("Face verified successfully");
          navigate("/dashboard");
        } else {
          toast.error(result.message || "Verification failed");
        }
      } catch (err) {
        console.error("Verification error:", err);
        toast.error("Verification failed");
      } finally {
        stopCamera();
        setScanning(false);
        setAuthMethod(null);
      }
    } else {
      // Fingerprint is mocked for now
      setTimeout(() => {
        setScanning(false);
        toast.success("Fingerprint verified successfully");
        navigate("/dashboard");
      }, 3000);
    }
  };

  const handlePinAuth = async () => {
    try {
      const result = await verifyPIN(pin);
      if (result.status === "success") {
        toast.success("PIN verified successfully");
        navigate("/dashboard");
      } else {
        toast.error(result.message || "Invalid PIN");
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      toast.error("PIN verification failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <Card className="relative z-10 w-full max-w-md p-8 bg-card/95 backdrop-blur-xl border-primary/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 glow-primary">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Biometric Car Security
          </h1>
          <p className="text-muted-foreground">Secure Engine Authentication System</p>
        </div>

        {!scanning && !authMethod && (
          <div className="space-y-4">
            <Button
              onClick={() => handleBiometricAuth("face")}
              className="w-full h-16 text-lg bg-primary hover:bg-primary/90 glow-primary"
              size="lg"
            >
              <Scan className="mr-3 h-6 w-6" />
              Face Recognition
            </Button>

            <Button
              onClick={() => handleBiometricAuth("fingerprint")}
              className="w-full h-16 text-lg bg-secondary hover:bg-secondary/90"
              variant="secondary"
              size="lg"
            >
              <Fingerprint className="mr-3 h-6 w-6" />
              Fingerprint Scan
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Emergency</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">Emergency PIN</Label>
              <div className="flex gap-2">
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="bg-secondary border-border"
                />
                <Button onClick={handlePinAuth} variant="outline" size="lg">
                  <KeyRound className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => navigate("/manager")}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Manager Login
              </Button>
              
              <Button
                onClick={() => navigate("/register")}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                New Driver? Register Here
              </Button>
            </div>
          </div>
        )}

        {scanning && (
          <div className="space-y-6">
            <div className="relative h-64 bg-secondary/50 rounded-lg overflow-hidden border-2 border-primary/30">
              <div className="absolute inset-0 flex items-center justify-center">
                {authMethod === "face" ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Fingerprint className="w-20 h-20 text-primary pulse-glow" />
                )}
              </div>
              <div className="absolute inset-0 scan-line h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                Scanning {authMethod === "face" ? "face" : "fingerprint"}...
              </p>
              <p className="text-sm text-muted-foreground">Please hold still</p>
            </div>

            <Button
              onClick={() => {
                setScanning(false);
                setAuthMethod(null);
              }}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Login;
