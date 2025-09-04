import {
  ArrowLeftIcon,
  ArrowRightLeft,
  BarChart,
  ClipboardList,
  QrCode,
  Share2,
  Users,
  Video,
} from "lucide-react";
import { useEvent } from "@/context/EventContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventScanner } from "./scanner/EventScanner";
import Collaborators from "./collaborators/Collaborators";
import Overview from "./overview/Overview";
import Promo from "./promo/Promo";
import { EventSelector } from "@/components/shared/EventSelector";
import { useState } from "react";
import { toast } from "sonner";

export default function EventDashboard() {
  const { events, selectedEvent, setSelectedEvent, isOrganizer } = useEvent();
  const [openSelector, setOpenSelector] = useState(false);

  if (!isOrganizer) {
    return (
      <div className="text-center py-10 text-red-500 font-semibold text-lg">
        Access Denied: Only organizers can view the event dashboard.
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">No event selected</p>
        <Button className="mt-4" onClick={() => setOpenSelector(true)}>
          Select Event
        </Button>
        <EventSelector open={openSelector} setOpen={setOpenSelector} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{selectedEvent.name}</h2>
          <p className="text-sm text-muted-foreground">
            Manage your event activities, tickets, and collaborations
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setOpenSelector(true)}>
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Switch Event
          </Button>
          <Button variant="secondary" onClick={() => toast.info("Edit screen coming soon")}>
            Edit Event
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">Flyer / Thumbnail</p>
          {selectedEvent.thumbnailUrl ? (
            <img
              src={selectedEvent.thumbnailUrl}
              alt="Event Thumbnail"
              className="rounded-md border mt-2 max-w-full"
            />
          ) : (
            <p className="italic text-sm text-muted-foreground mt-1">No flyer uploaded</p>
          )}
        </div>
        <div className="border rounded-md p-4">
          <p className="text-sm text-muted-foreground">Promo Video (Optional)</p>
          {selectedEvent.videoUrl ? (
            <video controls className="rounded-md mt-2 w-full max-h-52">
              <source src={selectedEvent.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <p className="italic text-sm text-muted-foreground mt-1">No video uploaded</p>
          )}
        </div>
        <div className="border rounded-md p-4 space-y-1">
          <p className="text-sm text-muted-foreground">Basic Stats</p>
          <p>Total Tickets: {selectedEvent.totalTickets}</p>
          <p>Scanned: {selectedEvent.scannedTickets}</p>
          <p>Revenue: ₦{selectedEvent.revenue?.toLocaleString() || 0}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="scan">
            <QrCode className="w-4 h-4 mr-2" />
            Scan
          </TabsTrigger>
          <TabsTrigger value="collaborators">
            <Users className="w-4 h-4 mr-2" />
            Collaborators
          </TabsTrigger>
          <TabsTrigger value="promo">
            <Share2 className="w-4 h-4 mr-2" />
            Promo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Overview />
        </TabsContent>
        <TabsContent value="scan">
          <EventScanner />
        </TabsContent>
        <TabsContent value="collaborators">
          <Collaborators />
        </TabsContent>
        <TabsContent value="promo">
          <Promo />
        </TabsContent>
      </Tabs>

      <EventSelector open={openSelector} setOpen={setOpenSelector} />
    </div>
  );
}
