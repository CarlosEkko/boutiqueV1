import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import { 
  Users, 
  CheckCircle, 
  XCircle,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  Crown,
  Mail,
  Phone,
  Globe,
  Calendar,
  Ban,
  Trash2,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminUsers = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, approved
  const [regionFilter, setRegionFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const regions = [
    { value: 'all', label: 'Todas Regiões', flag: '🌐' },
    { value: 'europe', label: 'Europa', flag: '🇪🇺' },
    { value: 'mena', label: 'MENA', flag: '🌍' },
    { value: 'latam', label: 'LATAM', flag: '🌎' }
  ];

  useEffect(() => {
    fetchUsers();
  }, [token, filter, regionFilter]);

  const fetchUsers = async () => {
    try {
      let url = `${API_URL}/api/admin/users?`;
      if (filter === 'pending') url += 'is_approved=false&';
      if (filter === 'approved') url += 'is_approved=true&';
      if (regionFilter && regionFilter !== 'all') url += `region=${regionFilter}&`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filter out internal users - only show clients
      const clientUsers = response.data.filter(u => u.user_type !== 'internal');
      setUsers(clientUsers);
    } catch (err) {
      toast.error('Falha ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User approved successfully');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User access revoked');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to reject user');
    }
  };

  const updateKYC = async (userId, status) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/kyc/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`KYC status updated to ${status}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update KYC status');
    }
  };

  const makeAdmin = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/make-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User is now an admin');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to make user admin');
    }
  };

  const removeAdmin = async (userId) => {
    try {
      await axios.post(`${API_URL}/api/admin/users/${userId}/remove-admin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Admin rights removed');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove admin rights');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getKYCBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-900/30 text-green-400">Approved</Badge>;
      case 'pending': return <Badge className="bg-gold-800/30 text-gold-400">Pending</Badge>;
      case 'rejected': return <Badge className="bg-red-900/30 text-red-400">Rejected</Badge>;
      default: return <Badge className="bg-gray-900/30 text-gray-400">Not Started</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage users, approvals, and KYC</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-gold-800/30 text-white"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved'].map((f) => (
            <Button
              key={f}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'default' : 'outline'}
              className={filter === f 
                ? 'bg-gold-500 hover:bg-gold-400' 
                : 'border-gold-800/30 text-gray-400 hover:text-white'
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <Card key={user.id} className="bg-zinc-900/50 border-gold-800/20">
              <CardContent className="p-4">
                {/* User Row */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <span className="text-gold-400 font-bold">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{user.name}</p>
                        {user.is_admin && (
                          <Crown size={14} className="text-gold-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status Badges */}
                    <div className="hidden md:flex items-center gap-2">
                      {user.is_approved ? (
                        <Badge className="bg-green-900/30 text-green-400">Approved</Badge>
                      ) : (
                        <Badge className="bg-gold-800/30 text-gold-400">Pending</Badge>
                      )}
                      {getKYCBadge(user.kyc_status)}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {!user.is_approved && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); approveUser(user.id); }}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Approve
                        </Button>
                      )}
                      {user.is_approved && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); rejectUser(user.id); }}
                          size="sm"
                          variant="outline"
                          className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                        >
                          <XCircle size={16} className="mr-1" />
                          Revoke
                        </Button>
                      )}
                    </div>

                    {/* Expand Icon */}
                    {expandedUser === user.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedUser === user.id && (
                  <div className="mt-4 pt-4 border-t border-gold-800/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={16} />
                        <span className="text-white">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={16} />
                        <span className="text-white">{user.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Globe size={16} />
                        <span className="text-white">{user.country || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar size={16} />
                        <span className="text-white">{formatDate(user.created_at)}</span>
                      </div>
                    </div>

                    {/* KYC Actions */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-gray-400 text-sm mr-2">KYC Status:</span>
                      {['not_started', 'pending', 'approved', 'rejected'].map((status) => (
                        <Button
                          key={status}
                          onClick={() => updateKYC(user.id, status)}
                          size="sm"
                          variant={user.kyc_status === status ? 'default' : 'outline'}
                          className={user.kyc_status === status 
                            ? 'bg-gold-500 hover:bg-gold-400' 
                            : 'border-gold-800/30 text-gray-400 hover:text-white text-xs'
                          }
                        >
                          {status.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>

                    {/* Admin Toggle */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm mr-2">Admin Rights:</span>
                      {user.is_admin ? (
                        <Button
                          onClick={() => removeAdmin(user.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-900/30 text-red-400 hover:bg-red-900/30"
                        >
                          <Shield size={14} className="mr-1" />
                          Remove Admin
                        </Button>
                      ) : (
                        <Button
                          onClick={() => makeAdmin(user.id)}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-500"
                        >
                          <Crown size={14} className="mr-1" />
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">No Users Found</h3>
              <p className="text-gray-400">No users match your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
