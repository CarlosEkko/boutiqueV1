import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Building2,
  Shield,
  Zap,
  Globe,
  Lock,
  Server,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MessageSquare,
  Code,
  Key,
  Activity,
  Briefcase,
  Landmark
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const InstitutionalPage = () => {
  const { t } = useTranslation();
  const [activeService, setActiveService] = useState('otc');

  const services = [
    {
      id: 'otc',
      title: t('institutional.otc', 'OTC Trading'),
      icon: Briefcase,
      description: t('institutional.otcDesc', 'Execução de grandes volumes com preços competitivos e liquidez profunda.'),
      features: [
        t('institutional.otcFeature1', 'Execução de ordens a partir de $100K'),
        t('institutional.otcFeature2', 'Preços competitivos em tempo real'),
        t('institutional.otcFeature3', 'Liquidação T+0'),
        t('institutional.otcFeature4', 'Suporte 24/7 dedicado'),
        t('institutional.otcFeature5', 'Múltiplas moedas fiat (USD, EUR, BRL, AED)'),
      ]
    },
    {
      id: 'custody',
      title: t('institutional.custody', 'Custódia Institucional'),
      icon: Lock,
      description: t('institutional.custodyDesc', 'Armazenamento seguro de ativos digitais com seguros e compliance regulatório.'),
      features: [
        t('institutional.custodyFeature1', 'Cold storage com HSM'),
        t('institutional.custodyFeature2', 'Seguro de até $250M'),
        t('institutional.custodyFeature3', 'Multi-signature authorization'),
        t('institutional.custodyFeature4', 'Auditoria SOC 2 Type II'),
        t('institutional.custodyFeature5', 'Relatórios de compliance personalizados'),
      ]
    },
    {
      id: 'api',
      title: t('institutional.api', 'APIs Institucionais'),
      icon: Code,
      description: t('institutional.apiDesc', 'Integração robusta com APIs REST e WebSocket para trading automatizado.'),
      features: [
        t('institutional.apiFeature1', 'REST API com latência < 10ms'),
        t('institutional.apiFeature2', 'WebSocket para dados em tempo real'),
        t('institutional.apiFeature3', 'FIX Protocol disponível'),
        t('institutional.apiFeature4', 'Rate limits personalizados'),
        t('institutional.apiFeature5', 'Sandbox para testes'),
      ]
    },
  ];

  const stats = [
    { value: '$5B+', label: t('institutional.tradingVolume', 'Volume Mensal'), icon: BarChart3 },
    { value: '150+', label: t('institutional.institutionalClients', 'Clientes Institucionais'), icon: Building2 },
    { value: '99.99%', label: t('institutional.uptime', 'Uptime'), icon: Activity },
    { value: '24/7', label: t('institutional.support', 'Suporte Premium'), icon: Phone },
  ];

  const clientTypes = [
    { name: t('institutional.hedgeFunds', 'Hedge Funds'), icon: BarChart3 },
    { name: t('institutional.familyOffices', 'Family Offices'), icon: Users },
    { name: t('institutional.assetManagers', 'Asset Managers'), icon: Briefcase },
    { name: t('institutional.corporations', 'Corporações'), icon: Building2 },
    { name: t('institutional.banks', 'Bancos'), icon: Landmark },
    { name: t('institutional.fintechs', 'Fintechs'), icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gold-500/10 border border-gold-500/20 rounded-full px-4 py-2 mb-6">
              <Building2 className="text-gold-400" size={18} />
              <span className="text-gold-400 text-sm font-medium">{t('institutional.badge', 'Soluções Institucionais')}</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-light text-white mb-6">
              {t('institutional.title', 'Infraestrutura de')} <br />
              <span className="text-gold-400">{t('institutional.titleHighlight', 'Classe Institucional')}</span>
            </h1>
            
            <p className="text-gray-400 text-lg max-w-3xl mx-auto mb-8">
              {t('institutional.subtitle', 'Acesse liquidez profunda, custódia segura e APIs de alta performance. Projetado para hedge funds, family offices, asset managers e corporações.')}
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white px-8 py-3">
                {t('institutional.scheduleDemo', 'Agendar Demonstração')}
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button variant="outline" className="border-gold-500/30 text-gold-400 hover:bg-gold-500/10 px-8 py-3">
                {t('institutional.viewDocs', 'Ver Documentação')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center">
                <stat.icon className="mx-auto text-gold-400 mb-3" size={28} />
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-gray-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <h2 className="text-2xl md:text-3xl font-light text-white text-center mb-12">
            {t('institutional.servicesTitle', 'Nossos Serviços')}
          </h2>

          {/* Service Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-1 bg-zinc-900/50 p-1 rounded-lg">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => setActiveService(service.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md text-sm font-medium transition-all ${
                    activeService === service.id
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  data-testid={`service-tab-${service.id}`}
                >
                  <service.icon size={18} />
                  {service.title}
                </button>
              ))}
            </div>
          </div>

          {/* Service Content */}
          {services.map(service => (
            activeService === service.id && (
              <div key={service.id} className="grid md:grid-cols-2 gap-8" data-testid={`service-content-${service.id}`}>
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8">
                  <div className="w-16 h-16 bg-gold-500/20 rounded-xl flex items-center justify-center mb-6">
                    <service.icon className="text-gold-400" size={32} />
                  </div>
                  <h3 className="text-2xl text-white font-medium mb-4">{service.title}</h3>
                  <p className="text-gray-400 mb-6">{service.description}</p>
                  
                  <ul className="space-y-3">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="text-gold-400 flex-shrink-0 mt-0.5" size={18} />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-zinc-900/50 to-zinc-800/30 border border-zinc-800/50 rounded-2xl p-8">
                  <h3 className="text-xl text-white font-medium mb-6">
                    {t('institutional.contactForm', 'Solicitar Informações')}
                  </h3>
                  
                  <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">{t('institutional.firstName', 'Nome')}</label>
                        <Input className="bg-zinc-800 border-zinc-700 text-white" placeholder="João" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm mb-2 block">{t('institutional.lastName', 'Sobrenome')}</label>
                        <Input className="bg-zinc-800 border-zinc-700 text-white" placeholder="Silva" />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">{t('institutional.email', 'Email Corporativo')}</label>
                      <Input type="email" className="bg-zinc-800 border-zinc-700 text-white" placeholder="joao@empresa.com" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">{t('institutional.company', 'Empresa')}</label>
                      <Input className="bg-zinc-800 border-zinc-700 text-white" placeholder="Nome da Empresa" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">{t('institutional.expectedVolume', 'Volume Mensal Esperado')}</label>
                      <select className="w-full bg-zinc-800 border border-zinc-700 rounded-md p-2.5 text-white">
                        <option>$100K - $500K</option>
                        <option>$500K - $1M</option>
                        <option>$1M - $5M</option>
                        <option>$5M - $10M</option>
                        <option>$10M+</option>
                      </select>
                    </div>
                    <Button className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white py-3">
                      {t('institutional.submit', 'Enviar Solicitação')}
                    </Button>
                  </form>
                </div>
              </div>
            )
          ))}
        </section>

        {/* Client Types */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <h2 className="text-2xl md:text-3xl font-light text-white text-center mb-4">
            {t('institutional.whoWeServe', 'Quem Atendemos')}
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            {t('institutional.whoWeServeDesc', 'Soluções personalizadas para diferentes tipos de instituições financeiras.')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {clientTypes.map((client, i) => (
              <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center hover:border-gold-500/30 transition-colors">
                <client.icon className="mx-auto text-gold-400 mb-3" size={32} />
                <p className="text-white text-sm font-medium">{client.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* API Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/50 border border-zinc-800/50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Code className="text-gold-400" size={24} />
                  <span className="text-gold-400 font-medium">{t('institutional.apiTitle', 'API Documentation')}</span>
                </div>
                <h3 className="text-3xl text-white font-light mb-4">
                  {t('institutional.buildWithUs', 'Construa com nossa API')}
                </h3>
                <p className="text-gray-400 mb-6">
                  {t('institutional.apiDescription', 'APIs RESTful e WebSocket de alta performance para integração com seus sistemas de trading. Documentação completa e suporte técnico dedicado.')}
                </p>
                
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-gray-300 text-sm">REST API</span>
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-gray-300 text-sm">WebSocket</span>
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-gray-300 text-sm">FIX 4.4</span>
                  <span className="px-3 py-1 bg-zinc-800 rounded-full text-gray-300 text-sm">OAuth 2.0</span>
                </div>

                <Button className="bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 border border-gold-500/30">
                  <Key size={16} className="mr-2" />
                  {t('institutional.getApiKey', 'Obter API Key')}
                </Button>
              </div>

              <div className="bg-zinc-900 rounded-xl p-6 font-mono text-sm">
                <div className="flex items-center gap-2 mb-4 text-gray-500">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  <span className="ml-2">api_example.py</span>
                </div>
                <pre className="text-gray-300 overflow-x-auto">
{`import kbex

client = kbex.Client(
    api_key="your_api_key",
    api_secret="your_api_secret"
)

# Get account balance
balance = client.get_balance()
print(balance)

# Place OTC order
order = client.otc.create_order(
    side="buy",
    symbol="BTC/USD",
    amount=10.0,
    price="market"
)
print(order)`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
              {t('institutional.contactTitle', 'Fale com Nossa Equipe')}
            </h2>
            <p className="text-gray-400">
              {t('institutional.contactDesc', 'Nossa equipe de especialistas está pronta para ajudar sua instituição.')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center hover:border-gold-500/30 transition-colors">
              <div className="w-14 h-14 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="text-gold-400" size={24} />
              </div>
              <h3 className="text-white font-medium mb-2">{t('institutional.phone', 'Telefone')}</h3>
              <p className="text-gray-400">+1 (888) KBEX-PRO</p>
              <p className="text-gray-500 text-sm mt-1">{t('institutional.available247', '24/7 para clientes')}</p>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center hover:border-gold-500/30 transition-colors">
              <div className="w-14 h-14 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="text-gold-400" size={24} />
              </div>
              <h3 className="text-white font-medium mb-2">{t('institutional.emailContact', 'Email')}</h3>
              <p className="text-gray-400">institutional@kbex.io</p>
              <p className="text-gray-500 text-sm mt-1">{t('institutional.responseTime', 'Resposta em até 2h')}</p>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 text-center hover:border-gold-500/30 transition-colors">
              <div className="w-14 h-14 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-gold-400" size={24} />
              </div>
              <h3 className="text-white font-medium mb-2">{t('institutional.liveChat', 'Chat Prioritário')}</h3>
              <p className="text-gray-400">{t('institutional.liveChatDesc', 'Suporte em tempo real')}</p>
              <p className="text-gray-500 text-sm mt-1">{t('institutional.dedicated', 'Gerente dedicado')}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default InstitutionalPage;
