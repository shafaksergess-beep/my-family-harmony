import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Smartphone, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PaymentIntegration = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();

  const webhookUrl = `${window.location.origin.replace('lovableproject.com', 'supabase.co')}/functions/v1/mobile-money-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageFinances) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only treasurers and family heads can manage payment integration</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}/payments`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payment Integration</h1>
              <p className="text-sm text-muted-foreground">Set up mobile money payment verification</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="mb-6">
          <Smartphone className="h-4 w-4" />
          <AlertTitle>Mobile Money Integration</AlertTitle>
          <AlertDescription>
            Connect MTN Mobile Money and Orange Money to automatically verify member payments. This integration uses webhooks to receive payment confirmations.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="mtn" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mtn">MTN Mobile Money</TabsTrigger>
            <TabsTrigger value="orange">Orange Money</TabsTrigger>
          </TabsList>

          <TabsContent value="mtn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-yellow-500" />
                  MTN Mobile Money Setup
                </CardTitle>
                <CardDescription>Configure MTN Mobile Money API integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Step 1: Register for MTN Developer Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Visit <a href="https://momodeveloper.mtn.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">momodeveloper.mtn.com</a> and create a developer account.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 2: Create Collection API Product</h3>
                  <p className="text-sm text-muted-foreground">
                    In your MTN Developer Portal, subscribe to the "Collection" product to receive payments.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 3: Configure Webhook</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add this webhook URL to your MTN MoMo API settings:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {webhookUrl}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 4: Payment Flow</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Member initiates payment via MTN Mobile Money</li>
                    <li>Include the payment transaction ID as reference</li>
                    <li>MTN sends webhook notification to our system</li>
                    <li>Payment status automatically updated in Family Together</li>
                  </ol>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Once configured, all MTN Mobile Money payments will be automatically verified and recorded.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orange" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  Orange Money Setup
                </CardTitle>
                <CardDescription>Configure Orange Money API integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Step 1: Register for Orange Developer Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Visit <a href="https://developer.orange.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">developer.orange.com</a> and create a developer account.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 2: Subscribe to Orange Money API</h3>
                  <p className="text-sm text-muted-foreground">
                    In your Orange Developer Portal, subscribe to the Orange Money Web Payment API.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 3: Configure Webhook</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add this webhook URL to your Orange Money API settings:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {webhookUrl}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Step 4: Payment Flow</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Member initiates payment via Orange Money</li>
                    <li>Include the payment transaction ID as reference</li>
                    <li>Orange sends webhook notification to our system</li>
                    <li>Payment status automatically updated in Family Together</li>
                  </ol>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Once configured, all Orange Money payments will be automatically verified and recorded.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Ensure your mobile money accounts are verified and approved for API access
            </p>
            <p>
              • Test the integration with small amounts before going live
            </p>
            <p>
              • Keep your API credentials secure and never share them
            </p>
            <p>
              • Contact your mobile money provider's support for assistance with API setup
            </p>
            <p>
              • The webhook URL must be accessible from the internet (HTTPS required)
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentIntegration;
