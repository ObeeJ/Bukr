// src/pages/ScannerPage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/contexts/EventContext";
import { useTicket } from "@/contexts/TicketContext";
import { useAuth } from "@/contexts/AuthContext";
import TicketScanner from "@/components/TicketScanner";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Event } from "@/types";

const ScannerPage = () => {
  const { eventId, eventKey } = useParams<{ eventId?: string; eventKey?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getEvent } = useEvent();
  const { validateTicket, markTicketAsUsed } = useTicket();
  const { user } = useAuth();
  const [status, setStatus] = useState<"valid" | "invalid" | "used" | null>(null);
  const [scanCount, setScanCount] = useState({ valid: 0, invalid: 0, used: 0 });
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!user || user.userType !== "organizer") {
      toast({
        title: "Access Denied",
        description: "Only organizers can access the ticket scanner.",
        variant: "destructive",
      });
      navigate("/app");
      return;
    }

    const fetchEvent = async () => {
      let event: Event | null = null;
      if (eventId) {
        event = await getEvent(eventId);
      } else if (eventKey) {
        const events = await getEvent("all");
        event = Array.isArray(events) ? events.find((e) => e.key === eventKey) || null : null;
      }

      if (!event) {
        toast({
          title: "Event Not Found",
          description: "The event you are trying to scan tickets for does not exist.",
          variant: "destructive",
        });
        navigate("/app");
      } else {
        setCurrentEvent(event);
      }
    };

    fetchEvent();
  }, [eventId, eventKey, getEvent, navigate, toast, user]);

  const handleScan = async (code: string) => {
    if (!currentEvent) return;

    try {
      const data = JSON.parse(code);
      if (!data.ticketId || !data.eventKey) {
        throw new Error("Invalid ticket data");
      }

      const result = await validateTicket(data.ticketId, data.eventKey);

      if (!result.isValid) {
        if (result.ticket?.status === "used") {
          setStatus("used");
          setScanCount((prev) => ({ ...prev, used: prev.used + 1 }));
          toast({
            title: "Ticket Already Used",
            description: "This ticket has already been scanned.",
            variant: "destructive",
          });
        } else {
          setStatus("invalid");
          setScanCount((prev) => ({ ...prev, invalid: prev.invalid + 1 }));
          toast({
            title: "Invalid Ticket",
            description: "This ticket is not valid for this event.",
            variant: "destructive",
          });
        }
        return;
      }

      await markTicketAsUsed(data.ticketId);
      setStatus("valid");
      setScanCount((prev) => ({ ...prev, valid: prev.valid + 1 }));
      toast({
        title: "Ticket Validated",
        description: "Ticket has been successfully validated and marked as used.",
      });
    } catch (error) {
      setStatus("invalid");
      setScanCount((prev) => ({ ...prev, invalid: prev.invalid + 1 }));
      toast({
        title: "Scan Failed",
        description: "Invalid ticket data. Please try scanning again.",
        variant: "destructive",
      });
    }
  };

  if (!currentEvent) {
    return null;
  }

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="p-2 hover-glow"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline logo font-medium">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold watermark mb-2">Ticket Scanner</h1>
          <p className="text-muted-foreground font-montserrat">
            Scan tickets for {currentEvent.title}
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Badge variant="outline" className="status-confirmed">
            Valid: {scanCount.valid}
          </Badge>
          <Badge variant="outline" className="status-trending">
            Used: {scanCount.used}
          </Badge>
          <Badge variant="outline" className="status-expired">
            Invalid: {scanCount.invalid}
          </Badge>
        </div>
      </div>

      {status && (
        <Alert
          className={`${
            status === "valid"
              ? "status-confirmed"
              : status === "used"
              ? "status-trending"
              : "status-expired"
          } mb-4 rounded-[var(--radius)]`}
        >
          {status === "valid" && <Check className="h-4 w-4" />}
          {status === "used" && <AlertCircle className="h-4 w-4" />}
          {status === "invalid" && <X className="h-4 w-4" />}
          <AlertTitle className="logo">
            {status === "valid" ? "Valid Ticket" : status === "used" ? "Already Used" : "Invalid Ticket"}
          </AlertTitle>
          <AlertDescription className="font-montserrat">
            {status === "valid"
              ? "Ticket has been validated and marked as used."
              : status === "used"
              ? "This ticket has already been scanned."
              : "This ticket is not valid for this event."}
          </AlertDescription>
        </Alert>
      )}

      <TicketScanner onScan={handleScan} />
    </div>
  );
};

export default ScannerPage;