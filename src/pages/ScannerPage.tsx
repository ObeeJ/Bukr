// src/pages/ScannerPage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/contexts/EventContext";
import { useAuth } from "@/contexts/AuthContext";
import TicketScanner from "@/components/TicketScanner";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Event } from "@/types";
import { useFeedback } from "@/hooks/useFeedback";
import FeedbackModal from "@/components/FeedbackModal";

const ScannerPage = () => {
  const { eventId, eventKey } = useParams<{ eventId?: string; eventKey?: string }>();
  const navigate = useNavigate();
  const { getEvent, getEventByKey } = useEvent();
  const { user } = useAuth();
  const { feedbackState, triggerFeedback, closeFeedback } = useFeedback();
  const [status, setStatus] = useState<"valid" | "invalid" | "used" | null>(null);
  const [scanCount, setScanCount] = useState({ valid: 0, invalid: 0, used: 0 });
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  // Trigger feedback when scanner leaves with at least 1 scan done
  useEffect(() => {
    return () => {
      if (user?.id && scanCount.valid > 0) {
        triggerFeedback(user.id, 'scanner', 'scan_session_ended');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user && !eventKey && !eventId) {
      navigate("/auth");
      return;
    }

    if (user && user.userType !== "organizer" && !eventKey && !eventId) {
      toast.error("Access Denied", { description: "Only organizers can access the ticket scanner." });
      navigate("/app");
      return;
    }

    const fetchEvent = async () => {
      setLoadingEvent(true);
      let event: Event | null = null;

      if (eventId) {
        event = await getEvent(eventId);
      } else if (eventKey) {
        event = await getEventByKey(eventKey);
      }

      if (!event) {
        toast.error("Event Not Found", { description: "The event you are trying to scan tickets for does not exist." });
        navigate("/app");
      } else {
        setCurrentEvent(event);
      }
      setLoadingEvent(false);
    };

    fetchEvent();
  }, [eventId, eventKey]);

  // TicketScanner handles full validation + mark-used internally.
  // This callback receives the raw QR string — we don't parse it here.
  // Scan counter is driven by the validated result via onScanResult.
  const handleScan = (_code: string) => {
    // intentionally empty: counter updates happen in handleScanResult
  };

  const handleScanResult = (status: 'valid' | 'invalid' | 'used') => {
    setScanCount(prev => ({ ...prev, [status]: prev[status] + 1 }));
    setStatus(status);
  };

  const handleEndSession = () => {
    if (user?.id && scanCount.valid > 0) {
      triggerFeedback(user.id, 'scanner', 'scan_session_ended');
    }
    navigate("/dashboard");
  };

  if (loadingEvent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentEvent) {
    return null;
  }

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={handleEndSession}
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
          className={`${status === "valid"
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

      <TicketScanner onScan={handleScan} onScanResult={handleScanResult} />

      {feedbackState && (
        <FeedbackModal
          open={feedbackState.open}
          userType={feedbackState.userType}
          journey={feedbackState.journey}
          onClose={closeFeedback}
        />
      )}
    </div>
  );
};

export default ScannerPage;
