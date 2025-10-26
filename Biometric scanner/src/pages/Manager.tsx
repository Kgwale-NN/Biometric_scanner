import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Settings,
  ArrowLeft,
  UserPlus,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const Manager = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const users = [
    {
      name: "John Doe",
      driverId: "DRV001",
      phone: "+27 123 456 789",
      vehicle: "ABC 1234 GP",
      status: "ACTIVE",
      registeredDate: "2024-01-15"
    },
    {
      name: "Jane Smith",
      driverId: "DRV002",
      phone: "+27 987 654 321",
      vehicle: "XYZ 5678 GP",
      status: "ACTIVE",
      registeredDate: "2024-01-20"
    }
  ];

  const systemSettings = {
    recognitionThreshold: "75%",
    systemVersion: "3.0-SECURE",
    engineComputerEnabled: true,
    gpsTrackingEnabled: true,
    antiTamperEnabled: true,
    encryptionEnabled: true
  };

  const handleLogin = () => {
    if (username === "admin" && password === "admin123") {
      setIsAuthenticated(true);
      toast.success("Manager authenticated successfully");
    } else {
      toast.error("Invalid credentials");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-card/95 backdrop-blur-xl border-primary/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Manager Login</h1>
            <p className="text-sm text-muted-foreground">Secure administrative access</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>

            <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90">
              Login
            </Button>

            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            size="icon"
            className="border-primary/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manager Panel
            </h1>
            <p className="text-muted-foreground">System administration and user management</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="p-6 border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Registered Users</h3>
                <Button className="bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>

              <div className="space-y-4">
                {users.map((user, i) => (
                  <Card key={i} className="p-4 bg-secondary/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{user.name}</h4>
                          <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                            {user.status}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <p>ID: {user.driverId}</p>
                          <p>Phone: {user.phone}</p>
                          <p>Vehicle: {user.vehicle}</p>
                          <p>Registered: {user.registeredDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="p-6 border-primary/20">
              <h3 className="text-xl font-semibold mb-6">System Configuration</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Engine Computer Control</p>
                    <p className="text-sm text-muted-foreground">ECU ignition blocking system</p>
                  </div>
                  <Badge variant={systemSettings.engineComputerEnabled ? "default" : "secondary"}>
                    {systemSettings.engineComputerEnabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">GPS Tracking</p>
                    <p className="text-sm text-muted-foreground">Real-time location monitoring</p>
                  </div>
                  <Badge variant={systemSettings.gpsTrackingEnabled ? "default" : "secondary"}>
                    {systemSettings.gpsTrackingEnabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Anti-Tamper Protection</p>
                    <p className="text-sm text-muted-foreground">Hardware integrity monitoring</p>
                  </div>
                  <Badge variant={systemSettings.antiTamperEnabled ? "default" : "secondary"}>
                    {systemSettings.antiTamperEnabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Data Encryption</p>
                    <p className="text-sm text-muted-foreground">256-bit secure encryption</p>
                  </div>
                  <Badge variant={systemSettings.encryptionEnabled ? "default" : "secondary"}>
                    {systemSettings.encryptionEnabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">Recognition Threshold</p>
                    <p className="text-sm text-muted-foreground">Biometric match accuracy</p>
                  </div>
                  <Badge variant="outline">{systemSettings.recognitionThreshold}</Badge>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium">System Version</p>
                    <p className="text-sm text-muted-foreground">Current software build</p>
                  </div>
                  <Badge variant="outline">{systemSettings.systemVersion}</Badge>
                </div>
              </div>

              <Card className="p-4 mt-6 border-warning/30 bg-warning/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-foreground">Configuration Changes</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Modifying system settings may affect security. Changes are logged and encrypted.
                    </p>
                  </div>
                </div>
              </Card>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Manager;
