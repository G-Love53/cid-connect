import React, { useState, useEffect } from 'react';
import {
  Zap, Plus, Loader2, RefreshCw, Trash2, Edit2, Save, X,
  CheckCircle, XCircle, Power, AlertTriangle, FileText, Bell, ClipboardList,
  Send, Play, Code
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  getWebhookRules, createWebhookRule, updateWebhookRule, deleteWebhookRule, toggleWebhookRule,
  sendTestWebhook, formatRelativeTime, type WebhookRule
} from '@/api';

const ACTION_TYPES = [
  { value: 'create_claim', label: 'Create Claim', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { value: 'update_policy_status', label: 'Update Policy Status', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'update_claim_status', label: 'Update Claim Status', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { value: 'send_notification', label: 'Send Notification', icon: <Bell className="w-3.5 h-3.5" /> },
  { value: 'log_audit', label: 'Log to Audit Trail', icon: <ClipboardList className="w-3.5 h-3.5" /> },
];

const getActionLabel = (type: string) => ACTION_TYPES.find(a => a.value === type)?.label || type;
const getActionIcon = (type: string) => ACTION_TYPES.find(a => a.value === type)?.icon || <Zap className="w-3.5 h-3.5" />;

interface RuleFormState {
  source_match: string;
  event_type_match: string;
  action_type: string;
  action_config_json: string;
  description: string;
  is_active: boolean;
}

const emptyForm: RuleFormState = {
  source_match: '',
  event_type_match: '',
  action_type: 'log_audit',
  action_config_json: '{}',
  description: '',
  is_active: true
};

const DEFAULT_TEST_BODY = JSON.stringify({
  source: 'test_ui',
  event_type: 'test_event',
  payload: {
    message: 'Hello from Test Webhook UI',
    timestamp: new Date().toISOString()
  }
}, null, 2);

const WebhookRulesTab: React.FC = () => {
  const [rules, setRules] = useState<WebhookRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Test Webhook state
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testBody, setTestBody] = useState(DEFAULT_TEST_BODY);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setLoading(true);
    const data = await getWebhookRules();
    setRules(data);
    setLoading(false);
  };

  const validateForm = (): string | null => {
    if (!form.event_type_match.trim()) return 'Event type match is required';
    if (!form.action_type) return 'Action type is required';
    try {
      JSON.parse(form.action_config_json);
    } catch {
      return 'Action config must be valid JSON';
    }
    return null;
  };

  const handleCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (rule: WebhookRule) => {
    setForm({
      source_match: rule.source_match || '',
      event_type_match: rule.event_type_match,
      action_type: rule.action_type,
      action_config_json: JSON.stringify(rule.action_config, null, 2),
      description: rule.description || '',
      is_active: rule.is_active
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }

    setSaving(true);
    const payload = {
      source_match: form.source_match.trim() || null,
      event_type_match: form.event_type_match.trim(),
      action_type: form.action_type,
      action_config: JSON.parse(form.action_config_json),
      description: form.description.trim() || null,
      is_active: form.is_active
    };

    if (editingId) {
      const ok = await updateWebhookRule(editingId, payload);
      setSaving(false);
      if (ok) {
        toast({ title: 'Rule Updated', description: 'Webhook rule has been updated.' });
        setShowForm(false);
        fetchRules();
      } else {
        toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
      }
    } else {
      const result = await createWebhookRule(payload);
      setSaving(false);
      if (result) {
        toast({ title: 'Rule Created', description: 'New webhook rule has been created.' });
        setShowForm(false);
        fetchRules();
      } else {
        toast({ title: 'Error', description: 'Failed to create rule', variant: 'destructive' });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this webhook rule? This cannot be undone.')) return;
    setDeletingId(id);
    const ok = await deleteWebhookRule(id);
    setDeletingId(null);
    if (ok) {
      toast({ title: 'Rule Deleted', description: 'Webhook rule has been removed.' });
      fetchRules();
    } else {
      toast({ title: 'Error', description: 'Failed to delete rule', variant: 'destructive' });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const ok = await toggleWebhookRule(id, isActive);
    if (ok) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r));
      toast({ title: isActive ? 'Rule Enabled' : 'Rule Disabled' });
    } else {
      toast({ title: 'Error', description: 'Failed to toggle rule', variant: 'destructive' });
    }
  };

  // Pre-fill test body from a rule
  const handlePrefillTest = (rule: WebhookRule) => {
    const body = {
      source: rule.source_match || 'test_ui',
      event_type: rule.event_type_match,
      payload: { message: `Test for rule: ${rule.description || rule.id}`, timestamp: new Date().toISOString() }
    };
    setTestBody(JSON.stringify(body, null, 2));
    setShowTestPanel(true);
    setTestResult(null);
  };

  const handleSendTest = async () => {
    let parsed: any;
    try {
      parsed = JSON.parse(testBody);
    } catch {
      toast({ title: 'Invalid JSON', description: 'Test body must be valid JSON', variant: 'destructive' });
      return;
    }

    setTestSending(true);
    setTestResult(null);
    const result = await sendTestWebhook(parsed);
    setTestSending(false);
    setTestResult(result);

    if (result.success) {
      toast({ title: 'Test Sent', description: `Event ID: ${result.data?.event_id || 'N/A'}, Rules matched: ${result.data?.rules_matched || 0}` });
    } else {
      toast({ title: 'Test Failed', description: result.error || 'Unknown error', variant: 'destructive' });
    }
  };

  // Collect distinct event_types and sources from rules for dropdown hints
  const distinctEventTypes = [...new Set(rules.map(r => r.event_type_match))];
  const distinctSources = [...new Set(rules.filter(r => r.source_match).map(r => r.source_match!))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-800">Webhook Rules</h3>
          <Badge className="bg-violet-100 text-violet-700 text-xs">{rules.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { setShowTestPanel(!showTestPanel); setTestResult(null); }} variant="outline" size="sm" className="flex items-center gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <Play className="w-3 h-3" /> Test Webhook
          </Button>
          <Button onClick={fetchRules} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
          <Button onClick={handleCreate} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> New Rule
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-violet-50 to-indigo-50">
        <CardContent className="p-4">
          <p className="text-sm text-gray-700">
            Webhook rules automatically process inbound webhook events. When an event matches a rule's
            <strong> source</strong> and <strong>event type</strong>, the configured action is executed.
            Outbound rule execution logs use canonical event_type <code className="bg-white/50 px-1 rounded text-xs">webhook_rule_execution</code> and source <code className="bg-white/50 px-1 rounded text-xs">rule_execution</code>.
          </p>
        </CardContent>
      </Card>

      {/* Test Webhook Panel */}
      {showTestPanel && (
        <Card className="border-2 border-emerald-200 shadow-md">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-600" />
                Test Webhook
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowTestPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Send a test POST to <code className="bg-gray-100 px-1 rounded">receive-external-webhook</code> without curl.
              Pre-fill from a rule or enter custom JSON.
            </p>

            {/* Quick pre-fill buttons */}
            {distinctEventTypes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-400 mr-1">Quick fill:</span>
                {distinctEventTypes.slice(0, 5).map(et => (
                  <Button
                    key={et}
                    variant="outline"
                    size="sm"
                    className="text-xs h-6 px-2"
                    onClick={() => {
                      const src = distinctSources[0] || 'test_ui';
                      setTestBody(JSON.stringify({ source: src, event_type: et, payload: { test: true, timestamp: new Date().toISOString() } }, null, 2));
                      setTestResult(null);
                    }}
                  >
                    {et}
                  </Button>
                ))}
              </div>
            )}

            <Textarea
              value={testBody}
              onChange={e => setTestBody(e.target.value)}
              rows={8}
              className="text-sm font-mono"
              placeholder='{ "source": "...", "event_type": "...", "payload": {} }'
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSendTest}
                disabled={testSending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                size="sm"
              >
                {testSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setTestBody(DEFAULT_TEST_BODY); setTestResult(null); }}
                className="text-xs"
              >
                Reset
              </Button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-semibold mb-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </p>
                {testResult.data && (
                  <pre className="text-xs text-gray-600 overflow-x-auto max-h-[200px] overflow-y-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                )}
                {testResult.error && (
                  <p className="text-xs text-red-600">{testResult.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="border-2 border-violet-200 shadow-md">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">
                {editingId ? 'Edit Rule' : 'Create New Rule'}
              </h4>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Source Match (optional, blank = any)</label>
                <Input
                  value={form.source_match}
                  onChange={e => setForm(f => ({ ...f, source_match: e.target.value }))}
                  placeholder="e.g. carrier_api, stripe"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Event Type Match *</label>
                <Input
                  value={form.event_type_match}
                  onChange={e => setForm(f => ({ ...f, event_type_match: e.target.value }))}
                  placeholder="e.g. claim_submitted, payment_received"
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Action Type *</label>
                <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(a => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what this rule does"
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Action Config (JSON) *</label>
              <Textarea
                value={form.action_config_json}
                onChange={e => setForm(f => ({ ...f, action_config_json: e.target.value }))}
                rows={4}
                className="text-sm font-mono"
                placeholder='{"template": "new_claim_alert", "to_role": "admin"}'
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                />
                <span className="text-sm text-gray-600">{form.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  {editingId ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            <span className="ml-2 text-gray-600">Loading webhook rules...</span>
          </CardContent>
        </Card>
      ) : rules.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No webhook rules configured</p>
            <p className="text-xs text-gray-400 mt-1">Create a rule to automatically process inbound webhook events.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <Card key={rule.id} className={`border-0 shadow-sm ${!rule.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <div className={`p-1 rounded ${rule.is_active ? 'bg-violet-100' : 'bg-gray-100'}`}>
                        {getActionIcon(rule.action_type)}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">
                        {getActionLabel(rule.action_type)}
                      </span>
                      <Badge variant="outline" className="text-xs text-gray-500 font-mono">
                        {rule.event_type_match}
                      </Badge>
                      {rule.source_match && (
                        <Badge className="bg-gray-100 text-gray-600 text-xs">
                          source: {rule.source_match}
                        </Badge>
                      )}
                      {!rule.source_match && (
                        <Badge className="bg-gray-50 text-gray-400 text-xs">any source</Badge>
                      )}
                      {rule.is_active ? (
                        <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-0.5">
                          <CheckCircle className="w-2.5 h-2.5" /> Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500 text-xs flex items-center gap-0.5">
                          <XCircle className="w-2.5 h-2.5" /> Inactive
                        </Badge>
                      )}
                    </div>
                    {rule.description && (
                      <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      Created {formatRelativeTime(rule.created_at)}
                      {rule.updated_at !== rule.created_at && ` · Updated ${formatRelativeTime(rule.updated_at)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handlePrefillTest(rule)}
                      title="Test this rule"
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(v) => handleToggle(rule.id, v)}
                    />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(rule)}>
                      <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                      disabled={deletingId === rule.id}
                      onClick={() => handleDelete(rule.id)}
                    >
                      {deletingId === rule.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Action config preview */}
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-500 overflow-x-auto">
                  {JSON.stringify(rule.action_config)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documentation note */}
      <div className="text-xs text-gray-400 text-center pt-2 space-y-1">
        <p>
          Rules are evaluated by <code className="bg-gray-100 px-1 rounded">receive-external-webhook</code> after
          inserting the inbound event. Matching uses <strong>exact</strong> comparison for event_type and source.
        </p>
        <p>
          Failed rule execution is logged to <code className="bg-gray-100 px-1 rounded">webhook_events</code>
          (event_type: <code className="bg-gray-100 px-1 rounded">webhook_rule_execution</code>, source: <code className="bg-gray-100 px-1 rounded">rule_execution</code>)
          and does not return 500 to the external caller.
        </p>
        <p>
          Claims created via <code className="bg-gray-100 px-1 rounded">create_claim</code> action are automatically assigned to staff via round-robin.
        </p>
      </div>
    </div>
  );
};

export default WebhookRulesTab;

