import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Shield,
  User,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllProfiles,
  updateUserRole,
  logAdminAction,
  UserProfile
} from '@/api';
import { toast } from '@/components/ui/use-toast';

const ROLE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'staff', label: 'Staff' },
  { value: 'admin', label: 'Admin' },
];

const roleBadgeColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  staff: 'bg-blue-100 text-blue-800',
  agent: 'bg-gray-100 text-gray-700',
};

const AdminUsersTab: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState<'created_at' | 'email' | 'role'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      toast({ title: 'Error', description: 'Failed to load user profiles', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (profile: UserProfile, newRole: string) => {
    if (newRole === profile.role) return;
    if (profile.id === user?.id && newRole !== 'admin') {
      if (!window.confirm('You are changing your own role away from admin. You may lose access. Continue?')) return;
    }
    const confirmed = window.confirm(
      `Change ${profile.email || profile.id.substring(0, 8)} from "${profile.role}" to "${newRole}"?`
    );
    if (!confirmed) return;

    setUpdatingId(profile.id);
    const ok = await updateUserRole(profile.id, newRole);
    setUpdatingId(null);

    if (ok) {
      toast({ title: 'Role Updated', description: `${profile.email || 'User'} is now "${newRole}"` });
      // Audit log
      if (user) {
        logAdminAction({
          admin_user_id: user.id,
          admin_email: user.email,
          action: 'user_role_change',
          entity_type: 'user',
          entity_id: profile.id,
          details: {
            user_email: profile.email,
            old_role: profile.role,
            new_role: newRole
          }
        }).catch(err => console.warn('Audit log error:', err));
      }
      await fetchProfiles();
    } else {
      toast({ title: 'Error', description: 'Failed to update role. You may not have admin permissions.', variant: 'destructive' });
    }
  };

  // Filter + sort
  const filtered = profiles
    .filter(p => {
      const matchesSearch =
        (p.email?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (p.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'email') {
        cmp = (a.email || '').localeCompare(b.email || '');
      } else if (sortField === 'role') {
        cmp = (a.role || '').localeCompare(b.role || '');
      } else {
        cmp = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });

  // Stats
  const stats = {
    total: profiles.length,
    admins: profiles.filter(p => p.role === 'admin').length,
    staff: profiles.filter(p => p.role === 'staff').length,
    agents: profiles.filter(p => p.role === 'agent').length,
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.admins}</p>
              <p className="text-xs text-gray-500">Admins</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.staff}</p>
              <p className="text-xs text-gray-500">Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-lg font-bold text-gray-800">{stats.agents}</p>
              <p className="text-xs text-gray-500">Agents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by email, name, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchProfiles} variant="outline" size="sm" className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#F7941D]" />
            <span className="ml-2 text-gray-600">Loading users...</span>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('email')}
                  >
                    <span className="flex items-center gap-1">Email <SortIcon field="email" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('role')}
                  >
                    <span className="flex items-center gap-1">Role <SortIcon field="role" /></span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                    onClick={() => toggleSort('created_at')}
                  >
                    <span className="flex items-center gap-1">Joined <SortIcon field="created_at" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1B3A5F] flex items-center justify-center text-white text-xs font-bold">
                          {(p.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.email || 'No email'}</p>
                          <p className="text-xs text-gray-400 font-mono">{p.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.full_name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${roleBadgeColors[p.role] || 'bg-gray-100 text-gray-700'} text-xs`}>
                        {p.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {updatingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                      ) : (
                        <Select
                          value={p.role}
                          onValueChange={(v) => handleRoleChange(p, v)}
                        >
                          <SelectTrigger className="w-[110px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filtered.length} of {profiles.length} users
        </p>
      )}
    </div>
  );
};

export default AdminUsersTab;
