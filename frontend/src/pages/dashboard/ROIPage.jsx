import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  PieChart, 
  TrendingUp, 
  DollarSign,
  Percent,
  Target
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ROIPage = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [roiData, setRoiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchROI();
  }, [token]);

  const fetchROI = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/roi`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoiData(response.data);
    } catch (err) {
      console.error('Failed to load ROI data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gold-400">{t('roi.loading', 'A carregar...')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-white">{t('roi.title', 'Retorno do Investimento')}</h1>
        <p className="text-gray-400 mt-1">{t('roi.subtitle', 'Acompanhe a performance dos seus investimentos')}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('roi.totalInvested', 'Total Investido')}</p>
                <p className="text-2xl font-light text-white mt-1">
                  {formatCurrency(roiData?.total_invested)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center">
                <DollarSign className="text-blue-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('roi.expectedReturns', 'Retornos Esperados')}</p>
                <p className="text-2xl font-light text-green-400 mt-1">
                  +{formatCurrency(roiData?.total_expected_returns)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                <Target className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('roi.realizedReturns', 'Retornos Realizados')}</p>
                <p className="text-2xl font-light text-gold-400 mt-1">
                  {formatCurrency(roiData?.total_actual_returns)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                <TrendingUp className="text-gold-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('roi.overallRoi', 'ROI Global')}</p>
                <p className="text-2xl font-light text-green-400 mt-1">
                  {roiData?.overall_roi_percentage?.toFixed(2)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
                <Percent className="text-green-400" size={24} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-white">{t('roi.investmentStatus', 'Estado dos Investimentos')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-3xl font-light text-green-400">{roiData?.active_investments || 0}</p>
                <p className="text-sm text-gray-400 mt-1">{t('roi.active', 'Ativos')}</p>
              </div>
              <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
                <p className="text-3xl font-light text-blue-400">{roiData?.completed_investments || 0}</p>
                <p className="text-sm text-gray-400 mt-1">{t('roi.completed', 'Concluídos')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-gold-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-white">{t('roi.roiComparison', 'Comparação de ROI')}</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{t('roi.expectedRoi', 'ROI Esperado')}</span>
                  <span className="text-green-400">{roiData?.overall_roi_percentage?.toFixed(2)}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                    style={{ width: `${Math.min(roiData?.overall_roi_percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{t('roi.realizedRoi', 'ROI Realizado')}</span>
                  <span className="text-gold-400">{roiData?.realized_roi_percentage?.toFixed(2)}%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full"
                    style={{ width: `${Math.min(roiData?.realized_roi_percentage || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Investments */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardHeader>
          <CardTitle className="text-white font-light">{t('roi.investmentDetails', 'Detalhes dos Investimentos')}</CardTitle>
        </CardHeader>
        <CardContent>
          {roiData?.investments?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gold-800/20">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('roi.colInvestment', 'Investimento')}</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('roi.colAmount', 'Valor')}</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('roi.colExpected', 'Retorno Esperado')}</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-medium">{t('roi.colRoi', 'ROI %')}</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-medium">{t('roi.colStatus', 'Estado')}</th>
                  </tr>
                </thead>
                <tbody>
                  {roiData.investments.map((inv) => (
                    <tr key={inv.id} className="border-b border-gold-800/10">
                      <td className="py-4 px-4 text-white">{inv.opportunity_name}</td>
                      <td className="py-4 px-4 text-right text-white">
                        {inv.amount} {inv.currency}
                      </td>
                      <td className="py-4 px-4 text-right text-green-400">
                        +{inv.expected_return?.toFixed(2)} {inv.currency}
                      </td>
                      <td className="py-4 px-4 text-right text-gold-400">
                        {inv.roi_percentage?.toFixed(2)}%
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          inv.status === 'active' 
                            ? 'bg-green-900/30 text-green-400'
                            : inv.status === 'completed'
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'bg-gray-900/30 text-gray-400'
                        }`}>
                          {inv.status === 'active' ? t('roi.active', 'Ativos') : inv.status === 'completed' ? t('roi.completed', 'Concluídos') : inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <PieChart className="mx-auto mb-4" size={48} />
              <p>{t('roi.noData', 'Sem investimentos para mostrar')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ROIPage;
