import { useTranslation } from "react-i18next";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Clock, AlertTriangle } from 'lucide-react';
import { backupService } from '@/lib/backupService';
import { useFamilyAuth } from '@/hooks/useFamilyAuth';
import { toast } from 'sonner';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export default function BackupRestore() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const { family } = useFamilyAuth(familySlug);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!familySlug || !family?.id) {
      if (!family?.id && familySlug) {
        toast.error(t("famBackupRestore.familyDataNotLoadedPlease"));
      }
      return;
    }
    
    setIsExporting(true);
    try {
      await backupService.downloadBackup(family.id, familySlug);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await backupService.restoreFromBackup(file);
        } catch (error) {
          console.error('Restore error:', error);
        }
      }
    };
    input.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t("famBackupRestore.backupRestore")}</h1>
        <p className="text-muted-foreground">
          {t("famBackupRestore.exportAndRestoreYourFamily")}
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("famBackupRestore.important")}</AlertTitle>
        <AlertDescription>
          {t("famBackupRestore.alwaysKeepARecentBackup")}
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t("famBackupRestore.exportData")}
            </CardTitle>
            <CardDescription>
              {t("famBackupRestore.downloadACompleteBackupOf")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("famBackupRestore.exportIncludes")}
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>{t("famBackupRestore.familySettingsAndConfiguration")}</li>
              <li>{t("famBackupRestore.allMemberProfiles")}</li>
              <li>{t("famBackupRestore.contributionRecords")}</li>
              <li>{t("famBackupRestore.loanHistoryAndPayments")}</li>
              <li>{t("famBackupRestore.meetingRecordsAndAttendance")}</li>
              <li>{t("famBackupRestore.assistanceEvents")}</li>
              <li>{t("famBackupRestore.savingsAndShares")}</li>
            </ul>
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("famBackupRestore.restoreData")}
            </CardTitle>
            <CardDescription>
              {t("famBackupRestore.restoreFromAPreviousBackup")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("famBackupRestore.warning")}</AlertTitle>
              <AlertDescription>
                {t("famBackupRestore.restoringWillOverwriteCurrentData")}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleRestore}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("famBackupRestore.selectBackupFile")}
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("famBackupRestore.automatedBackups")}
            </CardTitle>
            <CardDescription>
              {t("famBackupRestore.scheduleAutomaticMonthlyBackups")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("famBackupRestore.enableAutomatedMonthlyBackupsTo")}
            </p>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              {t("famBackupRestore.scheduleMonthlyBackup")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
