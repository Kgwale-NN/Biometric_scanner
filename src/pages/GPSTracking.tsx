import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Navigation, Clock, Activity } from "lucide-react";
import LeafletMap from "@/components/LeafletMap";

const GPSTracking = () => {
  const navigate = useNavigate();

  const currentLocation = {
    latitude: -26.2041,
    longitude: 28.0473,
    address: "Johannesburg, Gauteng, South Africa",
    lastUpdate: "Just now"
  };

  const locationHistory = [
    {
      address: "Johannesburg, Gauteng",
      time: "14:30:22",
      date: "2024-10-25",
      status: "Engine Start"
    },
    {
      address: "Sandton City, Johannesburg",
      time: "12:15:44",
      date: "2024-10-25",
      status: "Parked"
    },
    {
      address: "Midrand, Johannesburg",
      time: "08:22:10",
      date: "2024-10-25",
      status: "Engine Stop"
    },
    {
      address: "Pretoria, Gauteng",
      time: "17:45:33",
      date: "2024-10-24",
      status: "Engine Stop"
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
              GPS Tracking
            </h1>
            <p className="text-muted-foreground">Real-time vehicle location monitoring</p>
          </div>
        </div>

        {/* Current Location */}
        <Card className="p-6 border-primary/20 glow-primary">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">Current Location</h3>
              <p className="text-muted-foreground">Live tracking enabled</p>
            </div>
            <Badge variant="default" className="bg-success">
              <Activity className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{currentLocation.address}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentLocation.latitude}, {currentLocation.longitude}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated: {currentLocation.lastUpdate}</span>
            </div>
          </div>
        </Card>

        {/* Map Placeholder */}
        <Card className="p-6 border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Map View</h3>
          <div className="relative h-96 bg-secondary/50 rounded-lg overflow-hidden border-2 border-primary/20">
            {/* Map visualization using Google Maps */}
            <div className="absolute inset-0">
              <LeafletMap
                current={{ lat: currentLocation.latitude, lng: currentLocation.longitude, title: currentLocation.address, subtitle: currentLocation.lastUpdate }}
                locations={locationHistory.map((l) => ({ address: l.address, title: l.address, subtitle: `${l.date} ${l.time} — ${l.status}` }))}
              />
            </div>
            {/* Grid overlay for tech effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-20 pointer-events-none" />
          </div>
        </Card>

        {/* Location History */}
        <Card className="p-6 border-primary/20">
          <h3 className="text-lg font-semibold mb-4">Location History</h3>
          <div className="space-y-3">
            {locationHistory.map((location, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{location.address}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {location.date} at {location.time}
                  </p>
                </div>
                <Badge variant="outline" className="flex-shrink-0">
                  {location.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* GPS Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">100%</p>
                <p className="text-sm text-muted-foreground">Tracking Uptime</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">245</p>
                <p className="text-sm text-muted-foreground">Locations Logged</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">30s</p>
                <p className="text-sm text-muted-foreground">Update Interval</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GPSTracking;
