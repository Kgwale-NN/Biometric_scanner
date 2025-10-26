import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Lock,
  Unlock,
  MapPin,
  Shield,
  Activity,
  Clock,
  User,
  LogOut,
  Settings,
  History,
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [engineStatus, setEngineStatus] = useState<"LOCKED" | "ENABLED">("LOCKED");
  const [securityLevel, setSecurityLevel] = useState<"NORMAL" | "ENHANCED" | "LOCKDOWN">("NORMAL");

  const currentUser = {
    name: "John Doe",
    driverId: "DRV001",
    vehicle: "ABC 1234 GP"
  };

  const gpsLocation = {
    latitude: -26.2041,
    longitude: 28.0473,
    address: "Johannesburg, Gauteng, South Africa"
  };

  const toggleEngine = () => {
    if (engineStatus === "LOCKED") {
      setEngineStatus("ENABLED");
      toast.success("Engine enabled - Ready to drive");
    } else {
      setEngineStatus("LOCKED");
      toast.success("Engine locked - Vehicle secured");
    }
  };

  const securityLevelColor = {
    NORMAL: "success",
    ENHANCED: "warning",
    LOCKDOWN: "destructive"
  }[securityLevel];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Security Dashboard
            </h1>
            <p className="text-muted-foreground">Vehicle Protection System v3.0</p>
          </div>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="icon"
            className="border-primary/30"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* User Info */}
        <Card className="p-6 bg-card/80 backdrop-blur border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{currentUser.name}</h3>
              <p className="text-sm text-muted-foreground">ID: {currentUser.driverId} • {currentUser.vehicle}</p>
            </div>
            <Badge variant={securityLevel === "NORMAL" ? "default" : "destructive"} className="text-xs">
              {securityLevel}
            </Badge>
          </div>
        </Card>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Engine Status */}
          <Card className={`p-6 ${engineStatus === "ENABLED" ? "glow-success border-success/30" : "glow-destructive border-destructive/30"}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Car className="h-5 w-5" />
                Engine Status
              </h3>
              {engineStatus === "ENABLED" ? (
                <Unlock className="h-8 w-8 text-success pulse-glow" />
              ) : (
                <Lock className="h-8 w-8 text-destructive pulse-glow" />
              )}
            </div>
            <div className="space-y-4">
              <div className="text-center">
                <p className={`text-2xl font-bold ${engineStatus === "ENABLED" ? "text-success" : "text-destructive"}`}>
                  {engineStatus}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {engineStatus === "ENABLED" ? "Ready to drive" : "Anti-hotwiring active"}
                </p>
              </div>
              <Button
                onClick={toggleEngine}
                className={`w-full ${engineStatus === "ENABLED" ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}`}
              >
                {engineStatus === "ENABLED" ? "Lock Engine" : "Unlock Engine"}
              </Button>
            </div>
          </Card>

          {/* Security Status */}
          <Card className="p-6 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Status
              </h3>
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">System Integrity</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  OK
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hardware Status</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  Verified
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Encryption</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Active
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Anti-Tamper</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Enabled
                </Badge>
              </div>
            </div>
          </Card>

          {/* GPS Location */}
          <Card className="p-6 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                GPS Location
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/gps")}>
                View Map
              </Button>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{gpsLocation.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gpsLocation.latitude}, {gpsLocation.longitude}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Last updated: Just now</span>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6 md:col-span-2 lg:col-span-3 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Activity
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { action: "Engine Enabled", time: "2 min ago", status: "success" },
                { action: "Face Recognition Success", time: "2 min ago", status: "success" },
                { action: "Security Check Passed", time: "5 min ago", status: "success" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <div className={`w-2 h-2 rounded-full ${activity.status === "success" ? "bg-success" : "bg-destructive"}`} />
                  <span className="flex-1 text-sm">{activity.action}</span>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate("/manager")}
            variant="outline"
            className="h-16 border-primary/30"
          >
            <Settings className="mr-2 h-5 w-5" />
            Manager Panel
          </Button>
          <Button
            onClick={() => navigate("/history")}
            variant="outline"
            className="h-16 border-primary/30"
          >
            <History className="mr-2 h-5 w-5" />
            Access History
          </Button>
          <Button
            onClick={() => navigate("/gps")}
            variant="outline"
            className="h-16 border-primary/30"
          >
            <MapPin className="mr-2 h-5 w-5" />
            GPS Tracking
          </Button>
        </div>

        {/* Security Alert */}
        {securityLevel !== "NORMAL" && (
          <Card className="p-4 border-warning/30 bg-warning/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium">Enhanced Security Mode Active</p>
                <p className="text-sm text-muted-foreground">Additional verification may be required</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
