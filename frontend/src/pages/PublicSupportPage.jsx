import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PublicSupportPage = () => {
  const { token, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
    // Pre-fill if user is logged in
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
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Tipo de ficheiro não suportado`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: Ficheiro muito grande (máx. 10MB)`);
        return false;
      }
      return true;
    });
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
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
        
        const headers = { 'Content-Type': 'multipart/form-data' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await axios.post(`${API_URL}/api/uploads/file`, formData, { headers });
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
      // Upload files first
      setUploading(true);
      const attachmentUrls = await uploadFiles();
      setUploading(false);
      
      // If user is authenticated, create ticket via API
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
        // For non-authenticated users, create a public ticket
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

  // Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20">
          <Card className="bg-zinc-900/80 border-emerald-500/30">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Pedido Enviado com Sucesso!
              </h2>
              {ticketNumber && ticketNumber !== 'PENDING' && (
                <p className="text-lg text-emerald-400 mb-4">
                  Número do Ticket: <span className="font-mono font-bold">{ticketNumber}</span>
                </p>
              )}
              <p className="text-gray-400 mb-8">
                A nossa equipa irá analisar o seu pedido e responder o mais brevemente possível.
                {form.email && ` Receberá uma notificação em ${form.email}.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/help">
                  <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                    <Book size={16} className="mr-2" />
                    Centro de Ajuda
                  </Button>
                </Link>
                <Link to="/">
                  <Button className="bg-emerald-500 hover:bg-emerald-600">
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-emerald-900/20 to-transparent py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Contacte-nos
          </h1>
          <p className="text-xl text-gray-400">
            Estamos aqui para ajudar. Envie o seu pedido e responderemos em breve.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare size={20} className="text-emerald-400" />
                  Enviar Pedido de Suporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Nome Completo *
                      </label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="O seu nome"
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Assunto *
                    </label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Descreva brevemente o seu pedido"
                      className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Categoria
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
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
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Prioridade
                      </label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
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
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Descrição *
                    </label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descreva o seu problema ou questão em detalhe. Quanto mais informação fornecer, mais rapidamente poderemos ajudar."
                      className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-gray-500 focus:border-emerald-500 min-h-[150px]"
                      required
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Anexos (opcional)
                    </label>
                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload size={32} className="mx-auto text-gray-500 mb-3" />
                        <p className="text-gray-400 mb-1">
                          Arraste ficheiros ou <span className="text-emerald-400">clique para selecionar</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, JPEG, PNG, GIF (máx. 10MB por ficheiro, até 5 ficheiros)
                        </p>
                      </label>
                    </div>
                    
                    {/* Selected Files */}
                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-emerald-400" />
                              <span className="text-sm text-white truncate max-w-[200px]">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-red-400"
                            >
                              <X size={16} />
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
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 text-lg font-medium"
                  >
                    {submitting ? (
                      uploading ? 'A carregar ficheiros...' : 'A enviar...'
                    ) : (
                      <>
                        <Send size={18} className="mr-2" />
                        Enviar Pedido
                      </>
                    )}
                  </Button>

                  {isAuthenticated && (
                    <p className="text-sm text-center text-gray-500">
                      Autenticado como <span className="text-emerald-400">{user?.email}</span>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Ajuda Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link 
                  to="/help"
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Book size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Centro de Ajuda</div>
                    <div className="text-xs text-gray-400">FAQs e tutoriais</div>
                  </div>
                </Link>
                <Link 
                  to="/help/faqs"
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center">
                    <HelpCircle size={20} className="text-gold-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">FAQs</div>
                    <div className="text-xs text-gray-400">Perguntas frequentes</div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Contactos Directos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail size={18} className="text-emerald-400" />
                  <span>support@kbex.io</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone size={18} className="text-emerald-400" />
                  <span>+41 (0) 800 KBEX</span>
                </div>
                <div className="flex items-center gap-3 text-gray-400">
                  <Clock size={18} className="text-emerald-400" />
                  <span>24/7 para clientes VIP</span>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-gradient-to-br from-emerald-900/30 to-zinc-900/50 border-emerald-800/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-white font-medium mb-1">Tempo de Resposta</div>
                    <div className="text-sm text-gray-400">
                      Respondemos normalmente em menos de 24 horas. 
                      Clientes VIP têm suporte prioritário.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PublicSupportPage;
