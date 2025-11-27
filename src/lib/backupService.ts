import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackupData {
  familyId: string;
  timestamp: string;
  data: {
    family: any;
    members: any[];
    contributions: any[];
    loans: any[];
    meetings: any[];
    assistance_events: any[];
    savings: any[];
    shares: any[];
  };
}

export class BackupService {
  private static instance: BackupService;

  private constructor() {}

  static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  async exportFamilyData(familyId: string): Promise<BackupData> {
    try {
      // Fetch all family-related data
      const [
        { data: family },
        { data: members },
        { data: contributions },
        { data: loans },
        { data: meetings },
        { data: assistance_events },
        { data: savings },
        { data: shares },
      ] = await Promise.all([
        supabase.from('families').select('*').eq('id', familyId).single(),
        supabase.from('family_members').select('*, profiles(*)').eq('family_id', familyId),
        supabase.from('contributions').select('*').eq('family_id', familyId),
        supabase.from('loans').select('*').eq('family_id', familyId),
        supabase.from('meetings').select('*').eq('family_id', familyId),
        supabase.from('assistance_events').select('*').eq('family_id', familyId),
        supabase.from('savings').select('*').eq('family_id', familyId),
        supabase.from('shares').select('*').eq('family_id', familyId),
      ]);

      const backupData: BackupData = {
        familyId,
        timestamp: new Date().toISOString(),
        data: {
          family: family || {},
          members: members || [],
          contributions: contributions || [],
          loans: loans || [],
          meetings: meetings || [],
          assistance_events: assistance_events || [],
          savings: savings || [],
          shares: shares || [],
        },
      };

      return backupData;
    } catch (error) {
      console.error('Error exporting family data:', error);
      throw error;
    }
  }

  async downloadBackup(familyId: string, familyName: string) {
    try {
      toast.info('Preparing backup...');
      const backupData = await this.exportFamilyData(familyId);

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${familyName}-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Backup downloaded successfully!');
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Failed to download backup');
      throw error;
    }
  }

  async scheduleMonthlyBackup(familyId: string) {
    // TODO: Implement automated monthly backup via edge function
    // This would be triggered by a cron job
    try {
      const { error } = await supabase.functions.invoke('schedule-backup', {
        body: { familyId },
      });

      if (error) throw error;
      toast.success('Monthly backup scheduled successfully');
    } catch (error) {
      console.error('Error scheduling backup:', error);
      toast.error('Failed to schedule backup');
    }
  }

  async restoreFromBackup(file: File) {
    try {
      toast.info('Restoring from backup...');
      
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // TODO: Implement restore logic with proper validation
      // This should be done carefully to avoid data loss
      
      toast.warning('Restore functionality is not yet implemented for safety reasons');
      console.log('Backup data loaded:', backupData);
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Failed to restore backup');
      throw error;
    }
  }
}

export const backupService = BackupService.getInstance();
