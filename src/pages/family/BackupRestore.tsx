import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, Clock, AlertTriangle } from 'lucide-react';
import { backupService } from '@/lib/backupService';
import { toast } from 'sonner';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

export default function BackupRestore() {
  const { familySlug } = useParams();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!familySlug) return;
    
    setIsExporting(true);
    try {
      // TODO: Get family ID from slug
      await backupService.downloadBackup('family-id', familySlug);
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
        <h1 className="text-3xl font-bold mb-2">Backup & Restore</h1>
        <p className="text-muted-foreground">
          Export and restore your family data
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Always keep a recent backup of your family data. Backups include all contributions,
          loans, meetings, and member information.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download a complete backup of your family data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export includes:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>Family settings and configuration</li>
              <li>All member profiles</li>
              <li>Contribution records</li>
              <li>Loan history and payments</li>
              <li>Meeting records and attendance</li>
              <li>Assistance events</li>
              <li>Savings and shares</li>
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
              Restore Data
            </CardTitle>
            <CardDescription>
              Restore from a previous backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring will overwrite current data. Make sure to export current data first.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleRestore}
              variant="outline"
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Select Backup File
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Automated Backups
            </CardTitle>
            <CardDescription>
              Schedule automatic monthly backups
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable automated monthly backups to ensure your data is always protected.
              Backups will be stored securely and can be downloaded at any time.
            </p>
            <Button variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Schedule Monthly Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
