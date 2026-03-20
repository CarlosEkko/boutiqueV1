import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  TrendingUp, 
  Plus,
  Edit,
  Percent,
  Clock,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../../../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminOpportunities = () => {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    expected_roi: '',
    duration_days: '',
    min_investment: '',
    max_investment: '',
    total_pool: '',
    risk_level: 'medium',
    currency: 'USDT'
  });

  useEffect(() => {
    fetchOpportunities();
  }, [token]);

  const fetchOpportunities = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/investments/opportunities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOpportunities(response.data);
    } catch (err) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const createOpportunity = async (e) => {
    e.preventDefault();
    try {
      const params = new URLSearchParams(formData).toString();
      await axios.post(`${API_URL}/api/admin/opportunities?${params}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Opportunity created successfully');
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        expected_roi: '',
        duration_days: '',
        min_investment: '',
        max_investment: '',
        total_pool: '',
        risk_level: 'medium',
        currency: 'USDT'
      });
      fetchOpportunities();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create opportunity');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/admin/opportunities/${id}/status/${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Status updated to ${status}`);
      fetchOpportunities();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-green-900/30 text-green-400';
      case 'medium': return 'bg-gold-800/30 text-gold-400';
      case 'high': return 'bg-red-900/30 text-red-400';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-900/30 text-green-400';
      case 'active': return 'bg-blue-900/30 text-blue-400';
      case 'completed': return 'bg-gray-900/30 text-gray-400';
      case 'cancelled': return 'bg-red-900/30 text-red-400';
      default: return 'bg-gray-900/30 text-gray-400';
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
          <h1 className="text-3xl font-light text-white">Investment Opportunities</h1>
          <p className="text-gray-400 mt-1">Create and manage lending pools</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gold-500 hover:bg-gold-400"
        >
          <Plus size={18} className="mr-2" />
          {showCreateForm ? 'Cancel' : 'Create Opportunity'}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardHeader>
            <CardTitle className="text-white font-light">New Investment Opportunity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOpportunity} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-gray-300">Name</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Kilf Lending Pool"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label className="text-gray-300">Description</Label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the opportunity"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Expected ROI (%)</Label>
                <Input
                  name="expected_roi"
                  type="number"
                  step="0.1"
                  value={formData.expected_roi}
                  onChange={handleChange}
                  placeholder="e.g., 12.5"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Duration (days)</Label>
                <Input
                  name="duration_days"
                  type="number"
                  value={formData.duration_days}
                  onChange={handleChange}
                  placeholder="e.g., 90"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Min Investment</Label>
                <Input
                  name="min_investment"
                  type="number"
                  value={formData.min_investment}
                  onChange={handleChange}
                  placeholder="e.g., 1000"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Max Investment</Label>
                <Input
                  name="max_investment"
                  type="number"
                  value={formData.max_investment}
                  onChange={handleChange}
                  placeholder="e.g., 100000"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Total Pool Size</Label>
                <Input
                  name="total_pool"
                  type="number"
                  value={formData.total_pool}
                  onChange={handleChange}
                  placeholder="e.g., 500000"
                  required
                  className="bg-zinc-800 border-gold-800/30 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-gray-300">Risk Level</Label>
                <select
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-zinc-800 border border-gold-800/30 text-white rounded-md mt-1"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <Label className="text-gray-300">Currency</Label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full h-10 px-3 bg-zinc-800 border border-gold-800/30 text-white rounded-md mt-1"
                >
                  <option value="USDT">USDT</option>
                  <option value="USDC">USDC</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" className="w-full bg-gold-500 hover:bg-gold-400">
                  Create Opportunity
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Opportunities List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {opportunities.length > 0 ? (
          opportunities.map((opp) => {
            const progress = ((opp.current_pool || 0) / opp.total_pool) * 100;
            
            return (
              <Card key={opp.id} className="bg-zinc-900/50 border-gold-800/20">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl text-white font-medium">{opp.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">{opp.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getRiskColor(opp.risk_level)}>{opp.risk_level}</Badge>
                      <Badge className={getStatusColor(opp.status)}>{opp.status}</Badge>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <Percent className="mx-auto text-green-400 mb-1" size={20} />
                      <p className="text-xl text-white">{opp.expected_roi}%</p>
                      <p className="text-xs text-gray-400">ROI</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <Clock className="mx-auto text-gold-400 mb-1" size={20} />
                      <p className="text-xl text-white">{opp.duration_days}</p>
                      <p className="text-xs text-gray-400">Days</p>
                    </div>
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <DollarSign className="mx-auto text-blue-400 mb-1" size={20} />
                      <p className="text-xl text-white">{formatNumber(opp.total_pool, 0)}</p>
                      <p className="text-xs text-gray-400">{opp.currency}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Pool Progress</span>
                      <span className="text-white">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatNumber(opp.current_pool || 0, 0)} / {formatNumber(opp.total_pool, 0)} {opp.currency}
                    </p>
                  </div>

                  {/* Status Actions */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-gray-400 text-sm mr-2">Status:</span>
                    {['open', 'active', 'completed', 'cancelled'].map((status) => (
                      <Button
                        key={status}
                        onClick={() => updateStatus(opp.id, status)}
                        size="sm"
                        variant={opp.status === status ? 'default' : 'outline'}
                        className={opp.status === status 
                          ? 'bg-gold-500 hover:bg-gold-400 text-xs' 
                          : 'border-gold-800/30 text-gray-400 hover:text-white text-xs'
                        }
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-12 text-center">
              <TrendingUp className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">No Opportunities</h3>
              <p className="text-gray-400">Create your first investment opportunity.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminOpportunities;
