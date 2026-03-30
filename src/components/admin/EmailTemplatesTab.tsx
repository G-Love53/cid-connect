import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Eye,
  Loader2,
  RefreshCw,
  Mail,
  Code,
  ToggleLeft,
  ToggleRight,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getEmailTemplates,
  upsertEmailTemplate,
  deleteEmailTemplate,
  previewEmailTemplate,
  EmailTemplate
} from '@/api';
import { toast } from '@/components/ui/use-toast';

const ENTITY_TYPE_OPTIONS = [
  { value: 'claim', label: 'Claim' },
  { value: 'coi', label: 'COI Request' },
  { value: 'policy', label: 'Policy' },
];

const STATUS_TRIGGER_OPTIONS: Record<string, { value: string; label: string }[]> = {
  claim: [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
    { value: 'closed', label: 'Closed' },
    { value: 'settlement_set', label: 'Settlement Set' },
  ],
  coi: [
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ],
  policy: [
    { value: 'bound', label: 'Bound' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
};

const PLACEHOLDER_HELP = [
  { token: '{{reference_number}}', desc: 'Claim/COI/Policy number' },
  { token: '{{extra_context}}', desc: 'Additional details (HTML-escaped)' },
  { token: '{{user_email}}', desc: 'Recipient email' },
  { token: '{{user_name}}', desc: 'Recipient name' },
  { token: '{{status}}', desc: 'New status value' },
  { token: '{{entity_type}}', desc: 'Entity type (claim/coi/policy)' },
];

interface FormState {
  id?: string;
  entity_type: string;
  status_trigger: string;
  subject: string;
  html_body: string;
  description: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  entity_type: 'claim',
  status_trigger: 'approved',
  subject: '',
  html_body: '',
  description: '',
  is_active: true,
};

const EmailTemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setForm({ ...emptyForm });
    setEditing(true);
    setPreviewHtml(null);
  };

  const handleEdit = (t: EmailTemplate) => {
    setForm({
      id: t.id,
      entity_type: t.entity_type,
      status_trigger: t.status_trigger,
      subject: t.subject,
      html_body: t.html_body,
      description: t.description || '',
      is_active: t.is_active,
    });
    setEditing(true);
    setPreviewHtml(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({ ...emptyForm });
    setPreviewHtml(null);
  };

  const handleSave = async () => {
    if (!form.subject.trim() || !form.html_body.trim()) {
      toast({ title: 'Validation Error', description: 'Subject and HTML body are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await upsertEmailTemplate(form);
    setSaving(false);

    if (result) {
      toast({ title: form.id ? 'Template Updated' : 'Template Created', description: `${form.entity_type}/${form.status_trigger}` });
      setEditing(false);
      setForm({ ...emptyForm });
      setPreviewHtml(null);
      await fetchTemplates();
    } else {
      toast({ title: 'Error', description: 'Failed to save template. Check for duplicate entity_type + status_trigger.', variant: 'destructive' });
    }
  };

  const handleDelete = async (t: EmailTemplate) => {
    if (!window.confirm(`Delete template for ${t.entity_type}/${t.status_trigger}?`)) return;
    const ok = await deleteEmailTemplate(t.id);
    if (ok) {
      toast({ title: 'Deleted', description: 'Template removed' });
      await fetchTemplates();
    } else {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const handlePreview = () => {
    const result = previewEmailTemplate(form.html_body, form.subject);
    setPreviewHtml(result.html);
    setPreviewSubject(result.subject);
  };

  const statusOptions = STATUS_TRIGGER_OPTIONS[form.entity_type] || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#F7941D]" />
          <h3 className="text-lg font-semibold text-gray-800">Email Templates</h3>
          <Badge className="bg-gray-100 text-gray-600 text-xs">{templates.length} templates</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchTemplates} variant="outline" size="sm" className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
          {!editing && (
            <Button onClick={handleNew} size="sm" className="bg-[#F7941D] hover:bg-[#E07D0D] flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New Template
            </Button>
          )}
        </div>
      </div>

      {/* Placeholder reference */}
      <Card className="border-0 shadow-sm bg-blue-50/50">
        <CardContent className="p-3">
          <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
            <Code className="w-3 h-3" />
            Available Placeholders
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {PLACEHOLDER_HELP.map(p => (
              <span key={p.token} className="text-xs text-blue-700">
                <code className="bg-blue-100 px-1 rounded font-mono">{p.token}</code> {p.desc}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor */}
      {editing && (
        <Card className="border-0 shadow-md border-l-4 border-l-[#F7941D]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Edit2 className="w-4 h-4" />
              {form.id ? 'Edit Template' : 'New Template'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Entity Type</label>
                <Select
                  value={form.entity_type}
                  onValueChange={(v) => setForm(prev => ({ ...prev, entity_type: v, status_trigger: STATUS_TRIGGER_OPTIONS[v]?.[0]?.value || '' }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status Trigger</label>
                <Select
                  value={form.status_trigger}
                  onValueChange={(v) => setForm(prev => ({ ...prev, status_trigger: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description (optional)</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Internal note"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Subject Line</label>
              <Input
                value={form.subject}
                onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. Claim {{reference_number}} — Status: {{status}}"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">HTML Body</label>
              <textarea
                value={form.html_body}
                onChange={(e) => setForm(prev => ({ ...prev, html_body: e.target.value }))}
                className="w-full h-48 border border-gray-200 rounded-md p-3 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30"
                placeholder="<html>...</html>"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                className="flex items-center gap-2 text-sm"
              >
                {form.is_active ? (
                  <ToggleRight className="w-5 h-5 text-green-600" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-gray-400" />
                )}
                <span className={form.is_active ? 'text-green-700' : 'text-gray-500'}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#F7941D] hover:bg-[#E07D0D]">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
              <Button onClick={handlePreview} variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
              <Button onClick={handleCancel} variant="ghost" size="sm">
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewHtml && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
                <X className="w-3 h-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-2">Subject: <strong>{previewSubject}</strong></p>
            <div
              className="border border-gray-200 rounded-lg p-4 bg-white max-h-[400px] overflow-auto"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </CardContent>
        </Card>
      )}

      {/* Template list */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading templates...</span>
          </CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No email templates yet</p>
            <p className="text-xs text-gray-400 mt-1">Templates override the built-in email content for matching entity_type + status_trigger</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <Card key={t.id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 text-xs">{t.entity_type}</Badge>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">{t.status_trigger}</Badge>
                      {!t.is_active && (
                        <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.subject}</p>
                      {t.description && (
                        <p className="text-xs text-gray-400 truncate">{t.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const result = previewEmailTemplate(t.html_body, t.subject);
                        setPreviewHtml(result.html);
                        setPreviewSubject(result.subject);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(t)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTemplatesTab;
