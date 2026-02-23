import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  Gift, 
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminInvites = () => {
  const { token } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxUses, setMaxUses] = useState(1);

  useEffect(() => {
    fetchInvites();
  }, [token]);

  const fetchInvites = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/invites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvites(response.data);
    } catch (err) {
      toast.error('Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/admin/invites?max_uses=${maxUses}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Invite code created: ${response.data.code}`);
      fetchInvites();
    } catch (err) {
      toast.error('Failed to create invite code');
    }
  };

  const deactivateInvite = async (code) => {
    try {
      await axios.delete(`${API_URL}/api/admin/invites/${code}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Invite code deactivated');
      fetchInvites();
    } catch (err) {
      toast.error('Failed to deactivate invite code');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-amber-400">Loading...</div>
      </div>
    );
  }

  const activeInvites = invites.filter(i => i.is_active);
  const usedInvites = invites.filter(i => !i.is_active || i.uses >= i.max_uses);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white">Invite Codes</h1>
          <p className="text-gray-400 mt-1">Generate and manage referral codes</p>
        </div>
      </div>

      {/* Create New Invite */}
      <Card className="bg-zinc-900/50 border-amber-900/20">
        <CardHeader>
          <CardTitle className="text-white font-light">Generate New Code</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label className="text-gray-300">Max Uses</Label>
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                className="bg-zinc-800 border-amber-900/30 text-white mt-1"
              />
            </div>
            <Button onClick={createInvite} className="bg-amber-600 hover:bg-amber-500">
              <Plus size={18} className="mr-2" />
              Generate Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Invites */}
      <div>
        <h2 className="text-lg text-amber-400 mb-4 flex items-center gap-2">
          <CheckCircle size={20} /> Active Codes ({activeInvites.length})
        </h2>
        
        {activeInvites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeInvites.map((invite) => (
              <Card key={invite.id} className="bg-zinc-900/50 border-amber-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <code className="text-xl font-mono text-amber-400">{invite.code}</code>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyCode(invite.code)}
                        className="p-2 text-gray-400 hover:text-amber-400"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => deactivateInvite(invite.code)}
                        className="p-2 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Uses</span>
                      <span className="text-white">{invite.uses} / {invite.max_uses}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${(invite.uses / invite.max_uses) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created</span>
                      <span className="text-white">{formatDate(invite.created_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-zinc-900/50 border-amber-900/20">
            <CardContent className="p-8 text-center">
              <Gift className="mx-auto mb-4 text-gray-500" size={40} />
              <p className="text-gray-400">No active invite codes. Generate one above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Used/Inactive Invites */}
      {usedInvites.length > 0 && (
        <div>
          <h2 className="text-lg text-gray-400 mb-4 flex items-center gap-2">
            <XCircle size={20} /> Inactive/Used Codes ({usedInvites.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usedInvites.map((invite) => (
              <Card key={invite.id} className="bg-zinc-900/30 border-zinc-800">
                <CardContent className="p-4 opacity-60">
                  <div className="flex items-center justify-between mb-3">
                    <code className="text-xl font-mono text-gray-400">{invite.code}</code>
                    <Badge className="bg-gray-800 text-gray-400">
                      {invite.is_active ? 'Fully Used' : 'Deactivated'}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uses</span>
                      <span className="text-gray-400">{invite.uses} / {invite.max_uses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvites;
