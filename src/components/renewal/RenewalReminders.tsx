import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Bell, 
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Mail,
  Smartphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Policy } from '@/types';
import { toast } from '@/components/ui/use-toast';

interface RenewalRemindersProps {
  onBack: () => void;
  onShopRenewal: () => void;
}

interface Reminder {
  id: string;
  days_before: number;
  notification_type: 'email' | 'sms' | 'both';
  enabled: boolean;
}

const RenewalReminders: React.FC<RenewalRemindersProps> = ({ onBack, onShopRenewal }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: '1', days_before: 60, notification_type: 'email', enabled: true },
    { id: '2', days_before: 30, notification_type: 'both', enabled: true },
    { id: '3', days_before: 14, notification_type: 'both', enabled: true },
    { id: '4', days_before: 7, notification_type: 'both', enabled: true }
  ]);

  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    smsEnabled: false,
    phoneNumber: ''
  });

  useEffect(() => {
    if (user) {
      fetchPolicy();
    }
  }, [user]);

  const fetchPolicy = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error) {
        setPolicy(data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ));
  };

  const updateReminderType = (id: string, type: 'email' | 'sms' | 'both') => {
    setReminders(prev => prev.map(r => 
      r.id === id ? { ...r, notification_type: type } : r
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Save preferences to database
      const { error } = await supabase
        .from('renewal_preferences')
        .upsert({
          user_id: user?.id,
          policy_id: policy?.id,
          reminders: reminders,
          email_enabled: preferences.emailEnabled,
          sms_enabled: preferences.smsEnabled,
          phone_number: preferences.phoneNumber || null
        });

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: 'Your renewal reminder preferences have been updated'
      });
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to save preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilRenewal = policy ? getDaysUntilExpiration(policy.expiration_date) : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-[#F7941D]/10 rounded-lg">
          <Bell className="w-6 h-6 text-[#F7941D]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Renewal Reminders</h1>
          <p className="text-sm text-gray-500">Manage your renewal notifications</p>
        </div>
      </div>

      {!policy ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active policy found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Renewal Status Card */}
          <Card className={`border-0 shadow-lg ${
            daysUntilRenewal <= 30 
              ? 'bg-gradient-to-br from-orange-500 to-red-500' 
              : 'bg-gradient-to-br from-[#1B3A5F] to-[#2C5282]'
          } text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm opacity-80">Policy Renewal</p>
                  <p className="text-2xl font-bold">{formatDate(policy.expiration_date)}</p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    daysUntilRenewal <= 30 
                      ? 'bg-white/20' 
                      : 'bg-[#F7941D]'
                  }`}>
                    {daysUntilRenewal} days left
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm opacity-90">
                <Calendar className="w-4 h-4" />
                <span>{policy.policy_number} - {policy.business_name}</span>
              </div>

              {daysUntilRenewal <= 60 && (
                <Button
                  onClick={onShopRenewal}
                  className="w-full mt-4 bg-white text-[#1B3A5F] hover:bg-gray-100 font-semibold"
                >
                  Shop Your Renewal Now
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800">Email Notifications</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emailEnabled}
                  onCheckedChange={(checked) => setPreferences(prev => ({ 
                    ...prev, 
                    emailEnabled: checked 
                  }))}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">SMS Notifications</p>
                      <p className="text-sm text-gray-500">Receive text message reminders</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.smsEnabled}
                    onCheckedChange={(checked) => setPreferences(prev => ({ 
                      ...prev, 
                      smsEnabled: checked 
                    }))}
                  />
                </div>
                
                {preferences.smsEnabled && (
                  <div className="ml-8">
                    <Input
                      placeholder="Phone number"
                      value={preferences.phoneNumber}
                      onChange={(e) => setPreferences(prev => ({ 
                        ...prev, 
                        phoneNumber: e.target.value 
                      }))}
                      className="border-gray-200 focus:ring-[#F7941D] focus:border-[#F7941D]"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reminder Schedule */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#F7941D]" />
                Reminder Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reminders.map((reminder) => (
                <div 
                  key={reminder.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    reminder.enabled 
                      ? 'border-[#F7941D]/30 bg-orange-50' 
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={() => toggleReminder(reminder.id)}
                      />
                      <div>
                        <p className={`font-medium ${
                          reminder.enabled ? 'text-gray-800' : 'text-gray-400'
                        }`}>
                          {reminder.days_before} days before renewal
                        </p>
                        {policy && (
                          <p className="text-xs text-gray-400">
                            {formatDate(
                              new Date(
                                new Date(policy.expiration_date).getTime() - 
                                reminder.days_before * 24 * 60 * 60 * 1000
                              ).toISOString()
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {reminder.enabled && (
                      <Select
                        value={reminder.notification_type}
                        onValueChange={(value: 'email' | 'sms' | 'both') => 
                          updateReminderType(reminder.id, value)
                        }
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-[#F7941D] hover:bg-[#E07D0D] text-white font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default RenewalReminders;
