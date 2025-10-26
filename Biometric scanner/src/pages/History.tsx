import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, History as HistoryIcon, Search, Filter } from "lucide-react";

const History = () => {
  const navigate = useNavigate();

  const accessLogs = [
    {
      timestamp: "2024-10-25 14:30:22",
      user: "John Doe",
      action: "DRIVE_START",
      status: "GRANTED",
      method: "Face Recognition",
      matchScore: "91.2%",
      location: "Johannesburg, Gauteng",
      engineStatus: "ENABLED",
      securityLevel: "NORMAL"
    },
    {
      timestamp: "2024-10-25 14:30:15",
      user: "John Doe",
      action: "BIOMETRIC_SCAN",
      status: "SUCCESS",
      method: "Face Recognition",
      matchScore: "91.2%",
      location: "Johannesburg, Gauteng",
      engineStatus: "LOCKED",
      securityLevel: "NORMAL"
    },
    {
      timestamp: "2024-10-25 08:15:44",
      user: "Jane Smith",
      action: "DRIVE_START",
      status: "GRANTED",
      method: "Fingerprint",
      matchScore: "93.5%",
      location: "Johannesburg, Gauteng",
      engineStatus: "ENABLED",
      securityLevel: "NORMAL"
    },
    {
      timestamp: "2024-10-24 18:22:10",
      user: "Unknown",
      action: "DRIVE_ATTEMPT",
      status: "DENIED",
      method: "Face Recognition",
      matchScore: "42.1%",
      location: "Johannesburg, Gauteng",
      engineStatus: "LOCKED",
      securityLevel: "ENHANCED"
    },
    {
      timestamp: "2024-10-24 17:45:33",
      user: "John Doe",
      action: "ENGINE_LOCK",
      status: "SUCCESS",
      method: "Manual",
      matchScore: "N/A",
      location: "Johannesburg, Gauteng",
      engineStatus: "LOCKED",
      securityLevel: "NORMAL"
    }
  ];

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
              Access History
            </h1>
            <p className="text-muted-foreground">Complete log of all system activities</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 border-primary/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Button variant="outline" className="border-primary/30">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </Card>

        {/* Logs */}
        <div className="space-y-3">
          {accessLogs.map((log, i) => (
            <Card
              key={i}
              className={`p-4 border-l-4 ${
                log.status === "GRANTED" || log.status === "SUCCESS"
                  ? "border-l-success bg-success/5"
                  : "border-l-destructive bg-destructive/5"
              }`}
            >
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold">{log.action.replace(/_/g, " ")}</h4>
                      <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      log.status === "GRANTED" || log.status === "SUCCESS"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {log.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium">{log.user}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium">{log.method}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Match Score</p>
                    <p className="font-medium">{log.matchScore}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Security Level</p>
                    <Badge variant="outline" className="text-xs">
                      {log.securityLevel}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 text-sm pt-2 border-t border-border">
                  <div className="flex-1">
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{log.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Engine Status</p>
                    <Badge
                      variant={log.engineStatus === "ENABLED" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {log.engineStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Export Button */}
        <Card className="p-4 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Logs</p>
              <p className="text-sm text-muted-foreground">Download complete access history</p>
            </div>
            <Button variant="outline" className="border-primary/30">
              Export CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default History;
