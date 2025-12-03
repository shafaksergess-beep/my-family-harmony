import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Copy, ExternalLink, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptics } from "@/lib/haptics";

interface MobileMoneyPaymentProps {
  amount: number;
  reference: string;
  onPaymentInitiated?: () => void;
}

// Mobile Money USSD codes and deep links for Cameroon
const MOBILE_MONEY_PROVIDERS = {
  mtn: {
    name: "MTN Mobile Money",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    ussd: "*126#",
    // Deep link format for MTN MoMo app
    deepLink: (amount: number, ref: string) => 
      `mtn-momo://pay?amount=${amount}&reference=${encodeURIComponent(ref)}`,
    fallbackUrl: "https://play.google.com/store/apps/details?id=com.mtn.smartmoney",
    instructions: [
      "Dial *126# on your phone",
      "Select 'Transfer Money'",
      "Enter the family account number",
      `Enter amount: ${0} FCFA`,
      "Confirm with your PIN"
    ]
  },
  orange: {
    name: "Orange Money",
    color: "bg-orange-500",
    textColor: "text-orange-500",
    ussd: "#150#",
    deepLink: (amount: number, ref: string) => 
      `orange-money://pay?amount=${amount}&reference=${encodeURIComponent(ref)}`,
    fallbackUrl: "https://play.google.com/store/apps/details?id=com.orange.cm.orangemoney",
    instructions: [
      "Dial #150# on your phone",
      "Select 'Transfer'",
      "Enter the family account number",
      `Enter amount: ${0} FCFA`,
      "Confirm with your PIN"
    ]
  }
};

export function MobileMoneyPayment({ amount, reference, onPaymentInitiated }: MobileMoneyPaymentProps) {
  const [selectedProvider, setSelectedProvider] = useState<"mtn" | "orange" | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "confirming">("idle");
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    haptics.light();
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const initiatePayment = async (provider: "mtn" | "orange") => {
    setSelectedProvider(provider);
    setPaymentStatus("pending");
    haptics.medium();

    const config = MOBILE_MONEY_PROVIDERS[provider];
    
    // Try to open the mobile money app via deep link
    const deepLink = config.deepLink(amount, reference);
    
    // Create a hidden link and attempt to open
    const link = document.createElement("a");
    link.href = deepLink;
    link.style.display = "none";
    document.body.appendChild(link);
    
    // Set a timeout to detect if the app didn't open
    const timeout = setTimeout(() => {
      // If we're still here, the app probably isn't installed
      // Open the USSD code via tel: protocol
      window.location.href = `tel:${encodeURIComponent(config.ussd)}`;
    }, 1500);

    try {
      link.click();
      clearTimeout(timeout);
    } catch {
      clearTimeout(timeout);
      window.location.href = `tel:${encodeURIComponent(config.ussd)}`;
    }
    
    document.body.removeChild(link);
    onPaymentInitiated?.();
  };

  const openUSSD = (provider: "mtn" | "orange") => {
    const config = MOBILE_MONEY_PROVIDERS[provider];
    haptics.light();
    window.location.href = `tel:${encodeURIComponent(config.ussd)}`;
  };

  return (
    <div className="space-y-4">
      {/* Payment Amount Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-3xl font-bold text-primary">{amount.toLocaleString()} FCFA</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline" className="font-mono text-xs">
                Ref: {reference}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => copyToClipboard(reference, "Reference")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className={`h-20 flex-col gap-2 ${selectedProvider === "mtn" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => initiatePayment("mtn")}
        >
          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium">MTN MoMo</span>
        </Button>

        <Button
          variant="outline"
          className={`h-20 flex-col gap-2 ${selectedProvider === "orange" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => initiatePayment("orange")}
        >
          <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-medium">Orange Money</span>
        </Button>
      </div>

      {/* Payment Instructions */}
      {selectedProvider && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Payment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="space-y-2 text-sm">
              {MOBILE_MONEY_PROVIDERS[selectedProvider].instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">
                    {step.includes("${0}") ? step.replace("${0}", amount.toLocaleString()) : step}
                  </span>
                </li>
              ))}
            </ol>

            {/* Quick USSD Dial */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => openUSSD(selectedProvider)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Dial {MOBILE_MONEY_PROVIDERS[selectedProvider].ussd}
            </Button>

            {/* Payment Status */}
            {paymentStatus === "pending" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Waiting for payment confirmation...
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Always use the reference code when making payment</p>
              <p>• Payment confirmation may take up to 5 minutes</p>
              <p>• Keep your transaction ID for records</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
