import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { 
  GitBranch, 
  Users,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

const AdminPipeline = () => {
  // Pipeline stages
  const stages = [
    { name: 'Lead', count: 0, color: 'bg-gray-500' },
    { name: 'Contactado', count: 0, color: 'bg-blue-500' },
    { name: 'Proposta', count: 0, color: 'bg-yellow-500' },
    { name: 'Negociação', count: 0, color: 'bg-orange-500' },
    { name: 'Fechado', count: 0, color: 'bg-green-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light text-white flex items-center gap-3">
          <GitBranch className="text-gold-400" />
          Pipeline de Vendas
        </h1>
        <p className="text-gray-400 mt-1">Acompanhe o progresso das oportunidades de venda</p>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stages.map((stage, index) => (
          <Card key={stage.name} className="bg-zinc-900/50 border-gold-800/20">
            <CardContent className="p-4 text-center">
              <div className={`w-3 h-3 ${stage.color} rounded-full mx-auto mb-2`} />
              <p className="text-2xl font-bold text-white">{stage.count}</p>
              <p className="text-sm text-gray-400">{stage.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="bg-zinc-900/50 border-gold-800/20">
        <CardContent className="p-12 text-center">
          <GitBranch className="mx-auto mb-4 text-gray-500" size={48} />
          <h3 className="text-xl text-white mb-2">Pipeline em Desenvolvimento</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            O sistema de pipeline de vendas está sendo desenvolvido. 
            Em breve você poderá acompanhar todas as oportunidades de venda aqui.
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900/30 border-gold-800/10 hover:border-gold-500/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users size={24} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">Novo Lead</p>
              <p className="text-sm text-gray-400">Adicionar potencial cliente</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-gold-800/10 hover:border-gold-500/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock size={24} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-medium">Follow-ups</p>
              <p className="text-sm text-gray-400">Contactos pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-gold-800/10 hover:border-gold-500/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Relatórios</p>
              <p className="text-sm text-gray-400">Métricas de vendas</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPipeline;
