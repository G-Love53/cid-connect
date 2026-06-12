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
          <div className="p-3 bg-blue-50 rounded text-sm border border-blue-100">
            <div className="font-semibold text-[#1B3A5F] mb-2">Add CID Connect to your home screen</div>
            <p className="text-gray-600 mb-2">Get one-tap access to COIs, policy docs, and coverage chat.</p>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              <li><strong>iPhone:</strong> Safari → Share → Add to Home Screen</li>
              <li><strong>Android:</strong> Chrome menu → Install app / Add to Home screen</li>
            </ul>
          </div>
          <div className="p-3 bg-gray-50 rounded text-sm">
            <div className="font-medium">Quick tour</div>
            <ul className="list-disc pl-5 mt-1">
              <li>Policy Vault &amp; timeline</li>
              <li>Request a COI</li>
              <li>Am I Covered? chat</li>
              <li>Download documents</li>
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
