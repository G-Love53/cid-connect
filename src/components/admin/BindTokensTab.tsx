import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { BindTokenRow, createBindTokenRecord, getBindTokens, revokeBindToken } from '@/api';

interface BindTokensTabProps {
  onPendingCountChange?: (count: number) => void;
}

function statusOf(row: BindTokenRow): 'pending' | 'redeemed' | 'expired' {
  if (row.used_at) return 'redeemed';
  if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  return 'pending';
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const BindTokensTab: React.FC<BindTokensTabProps> = ({ onPendingCountChange }) => {
  const [policyId, setPolicyId] = useState('');
  const [intendedEmail, setIntendedEmail] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'redeemed' | 'expired'>('all');
  const [rows, setRows] = useState<BindTokenRow[]>([]);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRows = async () => {
    const result = await getBindTokens({ status, search, limit: 200 });
    setRows(result.rows);
  };

  useEffect(() => {
    void loadRows();
  }, [status, search]);

  const pendingCount = useMemo(() => rows.filter((r) => statusOf(r) === 'pending').length, [rows]);
  useEffect(() => onPendingCountChange?.(pendingCount), [pendingCount, onPendingCountChange]);

  const generateInvite = async () => {
    if (!policyId.trim() || !intendedEmail.trim()) {
      toast({ title: 'Missing fields', description: 'Policy ID and intended email are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const raw = crypto.randomUUID();
      const hash = await sha256Hex(raw);
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const created = await createBindTokenRecord({
        tokenHash: hash,
        intendedEmail: intendedEmail.trim().toLowerCase(),
        policyId: policyId.trim(),
        expiresAtIso: expires,
      });
      if (!created.ok) {
        toast({ title: 'Create failed', description: created.error || 'Could not issue bind token.', variant: 'destructive' });
        return;
      }
      const url = `${window.location.origin}/?bind_token=${encodeURIComponent(raw)}&email=${encodeURIComponent(intendedEmail.trim().toLowerCase())}`;
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
      toast({ title: 'Invite generated', description: 'Bind invite URL copied to clipboard.' });
      await loadRows();
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = async (id: string) => {
    const ok = await revokeBindToken(id);
    if (!ok) {
      toast({ title: 'Revoke failed', description: 'Unable to revoke token.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Revoked', description: 'Unused bind token revoked.' });
    await loadRows();
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Issue Bind Token Invite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Policy ID" value={policyId} onChange={(e) => setPolicyId(e.target.value)} />
            <Input placeholder="Intended email" value={intendedEmail} onChange={(e) => setIntendedEmail(e.target.value)} />
            <Button onClick={generateInvite} disabled={creating}>{creating ? 'Generating...' : 'Generate Invite'}</Button>
          </div>
          {inviteUrl && (
            <div className="p-3 bg-gray-50 rounded border text-sm break-all">
              <div className="font-medium mb-1">Invite URL</div>
              {inviteUrl}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Bind Tokens <Badge>{pendingCount} pending</Badge></CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Search email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="redeemed">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {rows.map((row) => {
              const st = statusOf(row);
              return (
                <div key={row.id} className="p-3 border rounded flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{row.intended_email}</div>
                    <div className="text-xs text-gray-500 break-all">policy: {row.policy_id || 'n/a'}</div>
                    <div className="text-xs text-gray-500">created: {new Date(row.created_at).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">used: {row.used_at ? new Date(row.used_at).toLocaleString() : '—'}</div>
                  </div>
                  <Badge variant={st === 'pending' ? 'default' : 'outline'}>
                    {st === 'redeemed' ? 'Used' : st}
                  </Badge>
                  {st === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => onRevoke(row.id)}>Revoke</Button>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && <div className="text-sm text-gray-500">No bind tokens found.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BindTokensTab;
