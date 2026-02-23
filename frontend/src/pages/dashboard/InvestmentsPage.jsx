import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Percent
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InvestmentsPage = () => {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [myInvestments, setMyInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('opportunities');

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [oppRes, invRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/investments/opportunities`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/dashboard/investments/my`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOpportunities(oppRes.data);
      setMyInvestments(invRes.data);
    } catch (err) {
      toast.error('Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'bg-green-900/30 text-green-400';
      case 'medium': return 'bg-amber-900/30 text-amber-400';
      case 'high': return 'bg-red-900/30 text-red-400';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-900/30 text-green-400';
      case 'completed': return 'bg-blue-900/30 text-blue-400';
      case 'open': return 'bg-amber-900/30 text-amber-400';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-amber-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">Investments</h1>
        <p className="text-gray-400 mt-1">Explore lending opportunities and manage your investments</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-amber-900/20 pb-2">
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'opportunities'
              ? 'bg-amber-600/20 text-amber-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Opportunities ({opportunities.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'my'
              ? 'bg-amber-600/20 text-amber-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          My Investments ({myInvestments.length})
        </button>
      </div>

      {/* Opportunities Tab */}
      {activeTab === 'opportunities' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opportunities.length > 0 ? (
            opportunities.map((opp) => {
              const progress = ((opp.current_pool || 0) / opp.total_pool) * 100;
              
              return (
                <Card 
                  key={opp.id}
                  className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/20 hover:border-amber-600/50 transition-all"
                >
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl text-white font-medium">{opp.name}</h3>
                        <p className="text-sm text-gray-400 mt-1">{opp.type}</p>
                      </div>
                      <Badge className={getRiskColor(opp.risk_level)}>
                        {opp.risk_level}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {opp.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-400">
                          <Percent size={16} />
                          <span className="text-2xl font-light">{opp.expected_roi}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Expected ROI</p>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Clock size={16} />
                          <span className="text-2xl font-light">{opp.duration_days}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Days</p>
                      </div>
                    </div>

                    {/* Investment Range */}
                    <div className="text-sm text-gray-400 mb-4">
                      <span>Min: {opp.min_investment} {opp.currency}</span>
                      <span className="mx-2">•</span>
                      <span>Max: {opp.max_investment} {opp.currency}</span>
                    </div>

                    {/* Pool Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Pool Progress</span>
                        <span className="text-white">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {opp.current_pool || 0} / {opp.total_pool} {opp.currency}
                      </p>
                    </div>

                    {/* Action */}
                    <Button 
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                      disabled={opp.status !== 'open'}
                    >
                      {opp.status === 'open' ? 'Invest Now' : 'Closed'}
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-full bg-zinc-900/50 border-amber-900/20">
              <CardContent className="p-12 text-center">
                <TrendingUp className="mx-auto mb-4 text-gray-500" size={48} />
                <h3 className="text-xl text-white mb-2">No Opportunities Available</h3>
                <p className="text-gray-400">
                  New investment opportunities will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* My Investments Tab */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {myInvestments.length > 0 ? (
            myInvestments.map((inv) => (
              <Card 
                key={inv.id}
                className="bg-zinc-900/50 border-amber-900/20"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center">
                        <TrendingUp className="text-amber-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg text-white">{inv.opportunity?.name || 'Investment'}</h3>
                        <p className="text-sm text-gray-400">
                          Invested: {inv.amount} {inv.currency}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Expected Return</p>
                        <p className="text-lg text-green-400">+{inv.expected_return} {inv.currency}</p>
                      </div>
                      <Badge className={getStatusColor(inv.status)}>
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-zinc-900/50 border-amber-900/20">
              <CardContent className="p-12 text-center">
                <AlertCircle className="mx-auto mb-4 text-gray-500" size={48} />
                <h3 className="text-xl text-white mb-2">No Investments Yet</h3>
                <p className="text-gray-400">
                  Start investing in opportunities to see them here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default InvestmentsPage;
