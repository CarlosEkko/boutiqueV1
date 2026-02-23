import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TransactionsPage = () => {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', currency: 'all' });

  useEffect(() => {
    fetchTransactions();
  }, [token, filter]);

  const fetchTransactions = async () => {
    try {
      let url = `${API_URL}/api/dashboard/transactions?limit=100`;
      if (filter.type !== 'all') url += `&type=${filter.type}`;
      if (filter.currency !== 'all') url += `&currency=${filter.currency}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit':
      case 'return':
        return <ArrowDownRight className="text-green-400" size={18} />;
      default:
        return <ArrowUpRight className="text-red-400" size={18} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'deposit':
      case 'return':
        return 'text-green-400';
      default:
        return 'text-red-400';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h1 className="text-3xl font-light text-white">Transactions</h1>
          <p className="text-gray-400 mt-1">View your transaction history</p>
        </div>
        <Button 
          variant="outline" 
          className="border-gold-800/30 text-gold-400"
          disabled
        >
          <Download size={18} className="mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filter.type} onValueChange={(v) => setFilter({...filter, type: v})}>
          <SelectTrigger className="w-[150px] bg-zinc-900 border-gold-800/30 text-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-gold-800/30">
            <SelectItem value="all" className="text-white">All Types</SelectItem>
            <SelectItem value="deposit" className="text-white">Deposit</SelectItem>
            <SelectItem value="withdrawal" className="text-white">Withdrawal</SelectItem>
            <SelectItem value="investment" className="text-white">Investment</SelectItem>
            <SelectItem value="return" className="text-white">Return</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.currency} onValueChange={(v) => setFilter({...filter, currency: v})}>
          <SelectTrigger className="w-[150px] bg-zinc-900 border-gold-800/30 text-white">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-gold-800/30">
            <SelectItem value="all" className="text-white">All Currencies</SelectItem>
            <SelectItem value="BTC" className="text-white">BTC</SelectItem>
            <SelectItem value="ETH" className="text-white">ETH</SelectItem>
            <SelectItem value="USDT" className="text-white">USDT</SelectItem>
            <SelectItem value="USDC" className="text-white">USDC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gold-800/10">
              {transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'deposit' || tx.type === 'return'
                        ? 'bg-green-600/20'
                        : 'bg-red-600/20'
                    }`}>
                      {getTypeIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-white capitalize font-medium">{tx.type}</p>
                      <p className="text-sm text-gray-400">{tx.description || tx.currency}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-medium ${getTypeColor(tx.type)}`}>
                      {tx.type === 'deposit' || tx.type === 'return' ? '+' : '-'}
                      {tx.amount} {tx.currency}
                    </p>
                    <p className="text-sm text-gray-400">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <History className="mx-auto mb-4 text-gray-500" size={48} />
              <h3 className="text-xl text-white mb-2">No Transactions</h3>
              <p className="text-gray-400">Your transaction history will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;
