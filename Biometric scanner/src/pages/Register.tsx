import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan, ArrowLeft, Camera } from "lucide-react";
import { toast } from "sonner";
import { registerUser } from "@/services/api";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    driver_id: "",
    phone: "",
    vehicle_reg: "",
  });
  const [step, setStep] = useState<"form" | "face-capture">("form");
  const [capturedPhotos, setCapturedPhotos] = useState<Blob[]>([]);
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
      setStep("form");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        setCapturedPhotos(prev => [...prev, blob]);
        toast.success(`Photo ${capturedPhotos.length + 1}/5 captured`);
        
        if (capturedPhotos.length + 1 >= 5) {
          await handleRegistration(blob);
        }
      }
    }, 'image/jpeg', 0.95);
  }, [capturedPhotos]);

  const handleRegistration = async (finalBlob: Blob) => {
    try {
      stopCamera();
      
      const data = new FormData();
      data.append('name', formData.name);
      data.append('driver_id', formData.driver_id);
      data.append('phone', formData.phone);
      data.append('vehicle_reg', formData.vehicle_reg);
      data.append('face_image', finalBlob);

      const result = await registerUser(data);
      
      if (result.status === "success") {
        toast.success("Registration successful!");
        navigate("/");
      } else {
        toast.error(result.message || "Registration failed");
        setStep("form");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("Registration failed");
      setStep("form");
    }
  };

  const handleNextStep = () => {
    if (!formData.name || !formData.driver_id || !formData.phone || !formData.vehicle_reg) {
      toast.error("Please fill all fields");
      return;
    }
    setStep("face-capture");
    startCamera();
  };

  const poses = ["Look straight", "Turn slightly left", "Turn slightly right", "Smile", "Neutral expression"];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopCamera();
              step === "form" ? navigate("/") : setStep("form");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold ml-2">Driver Registration</h2>
        </div>

        {step === "form" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="driver_id">Driver ID</Label>
              <Input
                id="driver_id"
                value={formData.driver_id}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_id: e.target.value }))}
                placeholder="Enter your driver ID"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <Label htmlFor="vehicle_reg">Vehicle Registration</Label>
              <Input
                id="vehicle_reg"
                value={formData.vehicle_reg}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_reg: e.target.value }))}
                placeholder="Enter vehicle registration"
              />
            </div>

            <Button className="w-full" onClick={handleNextStep}>
              Next: Face Registration
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-white text-center font-medium">
                  {poses[capturedPhotos.length]}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={capturePhoto}
                disabled={capturedPhotos.length >= 5}
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo ({capturedPhotos.length}/5)
              </Button>

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress:</span>
                <span>{capturedPhotos.length}/5 photos</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded ${
                      i < capturedPhotos.length
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Register;