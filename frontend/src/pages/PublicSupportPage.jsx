import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  Send,
  Upload,
  X,
  MessageSquare,
  HelpCircle,
  Book,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Headphones,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PublicSupportPage = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    priority: 'medium',
    description: ''
  });
  
  // File upload state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [isAuthenticated, user]);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024;
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Tipo de ficheiro não suportado`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: Ficheiro muito grande (máx. 5MB)`);
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 3));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [];
    
    const uploadedUrls = [];
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'documents');
        
        const response = await axios.post(`${API_URL}/api/uploads/public`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedUrls.push(response.data.url);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Erro ao carregar ${file.name}`);
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.subject || !form.description) {
      toast.error('Por favor preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    
    try {
      setUploading(true);
      const attachmentUrls = await uploadFiles();
      setUploading(false);
      
      if (isAuthenticated && token) {
        const response = await axios.post(`${API_URL}/api/kb/tickets`, {
          subject: form.subject,
          description: `**De:** ${form.name} (${form.email})\n\n${form.description}${attachmentUrls.length > 0 ? `\n\n**Anexos:** ${attachmentUrls.join(', ')}` : ''}`,
          category: form.category,
          priority: form.priority
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setTicketNumber(response.data.ticket_number);
      } else {
        const response = await axios.post(`${API_URL}/api/kb/public-ticket`, {
          name: form.name,
          email: form.email,
          subject: form.subject,
          description: form.description,
          category: form.category,
          priority: form.priority,
          attachments: attachmentUrls
        });
        
        setTicketNumber(response.data.ticket_number || 'PENDING');
      }
      
      setSubmitted(true);
      toast.success('Pedido de suporte enviado com sucesso!');
      
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(err.response?.data?.detail || 'Erro ao enviar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen - Same style as Home
  if (submitted) {
    return (
      <div className="bg-black min-h-screen">
        <Header />
        <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/50 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-transparent to-transparent" />
          
          <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 border border-gold-500/30 flex items-center justify-center animate-pulse">
              <CheckCircle size={48} className="text-gold-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
              Pedido <span className="text-gold-400">Enviado</span>
            </h2>
            {ticketNumber && ticketNumber !== 'PENDING' && (
              <p className="text-xl text-gold-400 mb-6 font-mono">
                Ticket: {ticketNumber}
              </p>
            )}
            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
              A nossa equipa irá analisar o seu pedido e responder o mais brevemente possível.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/help">
                <Button 
                  variant="outline" 
                  className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30 px-8 py-6 text-lg"
                >
                  <Book size={20} className="mr-2" />
                  Centro de Ajuda
                </Button>
              </Link>
              <Link to="/">
                <Button className="bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black px-8 py-6 text-lg font-medium">
                  Voltar ao Início
                  <ArrowRight size={20} className="ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <Header />
      
      {/* Hero Section - Same style as Home */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/50 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-transparent to-transparent" />
        
        {/* Animated lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent animate-pulse" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/10 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-16">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 border border-gold-500/30 flex items-center justify-center">
            <Headphones size={36} className="text-gold-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6">
            Como Podemos <span className="text-gold-400">Ajudar</span>?
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Estamos aqui para si. Preencha o formulário abaixo e a nossa equipa responderá em breve.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="relative py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-gold-800/20 rounded-2xl p-8" data-testid="support-form-card">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                    <MessageSquare size={20} className="text-gold-400" />
                  </div>
                  <h2 className="text-2xl font-light text-white">Enviar Pedido de Suporte</h2>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="support-form">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Nome Completo *</label>
                      <Input
                        data-testid="input-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="O seu nome"
                        className="bg-black/50 border-gold-800/30 text-white placeholder:text-gray-600 focus:border-gold-500 h-12"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Email *</label>
                      <Input
                        data-testid="input-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="bg-black/50 border-gold-800/30 text-white placeholder:text-gray-600 focus:border-gold-500 h-12"
                        required
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Assunto *</label>
                    <Input
                      data-testid="input-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Descreva brevemente o seu pedido"
                      className="bg-black/50 border-gold-800/30 text-white placeholder:text-gray-600 focus:border-gold-500 h-12"
                      required
                    />
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Categoria</label>
                      <select
                        data-testid="select-category"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full bg-black/50 border border-gold-800/30 rounded-lg px-4 py-3 text-white focus:border-gold-500 focus:outline-none"
                      >
                        <option value="general">Geral</option>
                        <option value="technical">Técnico</option>
                        <option value="billing">Faturação</option>
                        <option value="kyc">KYC / Verificação</option>
                        <option value="trading">Trading</option>
                        <option value="security">Segurança</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Prioridade</label>
                      <select
                        data-testid="select-priority"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full bg-black/50 border border-gold-800/30 rounded-lg px-4 py-3 text-white focus:border-gold-500 focus:outline-none"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Descrição *</label>
                    <Textarea
                      data-testid="input-description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descreva o seu problema ou questão em detalhe. Quanto mais informação fornecer, mais rapidamente poderemos ajudar."
                      className="bg-black/50 border-gold-800/30 text-white placeholder:text-gray-600 focus:border-gold-500 min-h-[150px]"
                      required
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Anexos (opcional)</label>
                    <div className="border-2 border-dashed border-gold-800/30 rounded-xl p-8 text-center hover:border-gold-500/50 transition-colors bg-black/30">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="file-input"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload size={36} className="mx-auto text-gold-500/50 mb-4" />
                        <p className="text-gray-400 mb-2">
                          Arraste ficheiros ou <span className="text-gold-400 font-medium">clique para selecionar</span>
                        </p>
                        <p className="text-xs text-gray-600">
                          PDF, JPEG, PNG, GIF (máx. 5MB por ficheiro, até 3 ficheiros)
                        </p>
                      </label>
                    </div>
                    
                    {/* Selected Files */}
                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gold-500/10 border border-gold-500/20 rounded-lg px-4 py-3"
                            data-testid={`file-item-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText size={18} className="text-gold-400" />
                              <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                              <span className="text-xs text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black py-6 text-lg font-medium transition-all duration-300 hover:shadow-lg hover:shadow-gold-500/20"
                    data-testid="submit-button"
                  >
                    {submitting ? (
                      uploading ? 'A carregar ficheiros...' : 'A enviar...'
                    ) : (
                      <>
                        <Send size={20} className="mr-2" />
                        Enviar Pedido
                      </>
                    )}
                  </Button>

                  {isAuthenticated && (
                    <p className="text-sm text-center text-gray-500">
                      Autenticado como <span className="text-gold-400">{user?.email}</span>
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Links */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-gold-800/20 rounded-2xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Ajuda Rápida</h3>
                <div className="space-y-3">
                  <Link 
                    to="/help"
                    className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-gold-800/20 hover:border-gold-500/30 transition-all group"
                    data-testid="link-help-center"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gold-500/20 flex items-center justify-center group-hover:bg-gold-500/30 transition-colors">
                      <Book size={24} className="text-gold-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Centro de Ajuda</div>
                      <div className="text-xs text-gray-500">FAQs e tutoriais</div>
                    </div>
                  </Link>
                  <Link 
                    to="/help/faqs"
                    className="flex items-center gap-4 p-4 rounded-xl bg-black/30 border border-gold-800/20 hover:border-gold-500/30 transition-all group"
                    data-testid="link-faqs"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gold-500/20 flex items-center justify-center group-hover:bg-gold-500/30 transition-colors">
                      <HelpCircle size={24} className="text-gold-400" />
                    </div>
                    <div>
                      <div className="text-white font-medium">FAQs</div>
                      <div className="text-xs text-gray-500">Perguntas frequentes</div>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-gold-800/20 rounded-2xl p-6">
                <h3 className="text-lg font-medium text-white mb-4">Contactos Directos</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <Mail size={18} className="text-gold-400" />
                    </div>
                    <span>support@kbex.io</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <Phone size={18} className="text-gold-400" />
                    </div>
                    <span>+41 (0) 800 KBEX</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <Clock size={18} className="text-gold-400" />
                    </div>
                    <span>24/7 para clientes VIP</span>
                  </div>
                </div>
              </div>

              {/* Response Time */}
              <div className="bg-gradient-to-br from-gold-900/20 to-zinc-900/50 border border-gold-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={24} className="text-gold-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium mb-2">Tempo de Resposta</div>
                    <div className="text-sm text-gray-400">
                      Respondemos normalmente em menos de 24 horas. Clientes VIP têm suporte prioritário.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicSupportPage;
