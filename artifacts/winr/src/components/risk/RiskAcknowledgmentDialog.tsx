import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RISK_TEXT } from "./RiskDisclaimer";

const STORAGE_PREFIX = "winr.risk-ack.";

export function RiskAcknowledgmentDialog() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    const key = `${STORAGE_PREFIX}${user.id}`;
    const acked = window.localStorage.getItem(key);
    if (!acked) setOpen(true);
  }, [isLoaded, isSignedIn, user?.id]);

  const handleAccept = () => {
    if (user?.id) {
      window.localStorage.setItem(
        `${STORAGE_PREFIX}${user.id}`,
        new Date().toISOString(),
      );
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="border-amber-500/40"
        data-testid="risk-acknowledgment-dialog"
      >
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-center text-xl">Risk Disclosure</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
            {RISK_TEXT}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={handleAccept}
            data-testid="button-accept-risk"
            className="bg-amber-500 text-black hover:bg-amber-400 font-semibold"
          >
            I understand and I accept the risk
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
