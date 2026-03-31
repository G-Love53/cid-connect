import React, { useState } from 'react';
import { Policy } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

interface Props {
  userId: string;
  policies: Policy[];
  currentFullName?: string | null;
  onDone: () => void;
}

const PostBindOnboarding: React.FC<Props> = ({ userId, policies, currentFullName, onDone }) => {
  const [fullName, setFullName] = useState(currentFullName || '');
  const [saving, setSaving] = useState(false);

  const complete = async () => {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName || null, onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', userId);
    setSaving(false);
    onDone();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle>Welcome to CID Connect</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">Your account was linked to your policy access.</p>
          <div className="space-y-2">
            {policies.map((p) => (
              <div key={p.id} className="p-3 border rounded">
                <div className="font-medium">{p.policy_number}</div>
                <div className="text-xs text-gray-500">{p.carrier} • ${p.premium?.toLocaleString()} • exp {p.expiration_date}</div>
              </div>
            ))}
          </div>
          <div>
            <label className="text-sm font-medium">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="p-3 bg-gray-50 rounded text-sm">
            <div>Quick Tour</div>
            <ul className="list-disc pl-5">
              <li>Policy Vault</li>
              <li>File a Claim</li>
              <li>Request COI</li>
              <li>Coverage Chat</li>
            </ul>
          </div>
          <Button onClick={complete} disabled={saving}>
            {saving ? 'Saving...' : 'Get Started'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostBindOnboarding;
