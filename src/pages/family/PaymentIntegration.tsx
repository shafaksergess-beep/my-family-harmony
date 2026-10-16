import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Smartphone, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PaymentIntegration = () => {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances, isLoading } = useFamilyAuth(familySlug);
  const { toast } = useToast();

  const webhookUrl = `${window.location.origin.replace('lovableproject.com', 'supabase.co')}/functions/v1/mobile-money-webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("famPaymentIntegration.copied"),
      description: t("famPaymentIntegration.webhookUrlCopiedToClipboard"),
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
            <CardTitle>{t("famPaymentIntegration.accessDenied")}</CardTitle>
            <CardDescription>{t("famPaymentIntegration.onlyTreasurersAndFamilyHeads")}</CardDescription>
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
              {t("famPaymentIntegration.backToPayments")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("famPaymentIntegration.paymentIntegration")}</h1>
              <p className="text-sm text-muted-foreground">{t("famPaymentIntegration.setUpMobileMoneyPayment")}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="mb-6">
          <Smartphone className="h-4 w-4" />
          <AlertTitle>{t("famPaymentIntegration.mobileMoneyIntegration")}</AlertTitle>
          <AlertDescription>
            {t("famPaymentIntegration.connectMtnMobileMoneyAnd")}
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="mtn" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mtn">{t("famPaymentIntegration.mtnMobileMoney")}</TabsTrigger>
            <TabsTrigger value="orange">{t("famPaymentIntegration.orangeMoney")}</TabsTrigger>
          </TabsList>

          <TabsContent value="mtn" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-yellow-500" />
                  {t("famPaymentIntegration.mtnMobileMoneySetup")}
                </CardTitle>
                <CardDescription>{t("famPaymentIntegration.configureMtnMobileMoneyApi")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step1RegisterForMtn")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("famPaymentIntegration.visit")} <a href="https://momodeveloper.mtn.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">momodeveloper.mtn.com</a> {t("famPaymentIntegration.andCreateADeveloperAccount")}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step2CreateCollectionApi")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("famPaymentIntegration.inYourMtnDeveloperPortal")}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step3ConfigureWebhook")}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("famPaymentIntegration.addThisWebhookUrlTo")}
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
                  <h3 className="font-semibold">{t("famPaymentIntegration.step4PaymentFlow")}</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>{t("famPaymentIntegration.memberInitiatesPaymentViaMtn")}</li>
                    <li>{t("famPaymentIntegration.includeThePaymentTransactionId")}</li>
                    <li>{t("famPaymentIntegration.mtnSendsWebhookNotificationTo")}</li>
                    <li>{t("famPaymentIntegration.paymentStatusAutomaticallyUpdatedIn")}</li>
                  </ol>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("famPaymentIntegration.onceConfiguredAllMtnMobile")}
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
                  {t("famPaymentIntegration.orangeMoneySetup")}
                </CardTitle>
                <CardDescription>{t("famPaymentIntegration.configureOrangeMoneyApiIntegration")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step1RegisterForOrange")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("famPaymentIntegration.visit")} <a href="https://developer.orange.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">developer.orange.com</a> {t("famPaymentIntegration.andCreateADeveloperAccount")}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step2SubscribeToOrange")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("famPaymentIntegration.inYourOrangeDeveloperPortal")}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">{t("famPaymentIntegration.step3ConfigureWebhook")}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("famPaymentIntegration.addThisWebhookUrlTo")}
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
                  <h3 className="font-semibold">{t("famPaymentIntegration.step4PaymentFlow")}</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>{t("famPaymentIntegration.memberInitiatesPaymentViaOrange")}</li>
                    <li>{t("famPaymentIntegration.includeThePaymentTransactionId")}</li>
                    <li>{t("famPaymentIntegration.orangeSendsWebhookNotificationTo")}</li>
                    <li>{t("famPaymentIntegration.paymentStatusAutomaticallyUpdatedIn")}</li>
                  </ol>
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("famPaymentIntegration.onceConfiguredAllOrangeMoney")}
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
              {t("famPaymentIntegration.importantNotes")}
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
