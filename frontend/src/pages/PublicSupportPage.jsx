import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  Headphones
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
      const maxSize = 5 * 1024 * 1024; // 5MB for public uploads
      
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
    
    setFiles(prev => [...prev, ...validFiles].slice(0, 3)); // Max 3 files for public
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
        
        // Use public upload endpoint (no auth required)
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
      // Upload files first
      setUploading(true);
      const attachmentUrls = await uploadFiles();
      setUploading(false);
      
      // If user is authenticated, create ticket via authenticated API
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

  // Success screen - Light theme
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20">
          <Card className="bg-white border-emerald-200 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Pedido Enviado com Sucesso!
              </h2>
              {ticketNumber && ticketNumber !== 'PENDING' && (
                <p className="text-lg text-emerald-600 mb-4">
                  Número do Ticket: <span className="font-mono font-bold">{ticketNumber}</span>
                </p>
              )}
              <p className="text-gray-600 mb-8">
                A nossa equipa irá analisar o seu pedido e responder o mais brevemente possível.
                {form.email && ` Receberá uma notificação em ${form.email}.`}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/help">
                  <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                    <Book size={16} className="mr-2" />
                    Centro de Ajuda
                  </Button>
                </Link>
                <Link to="/">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Header />
      
      {/* Hero Section - Light theme */}
      <div className="bg-gradient-to-b from-emerald-50 to-white py-16 border-b border-emerald-100">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
            <Headphones size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Como Podemos Ajudar?
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos aqui para ajudar. Preencha o formulário abaixo e a nossa equipa responderá em breve.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Contact Form - Light theme */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-gray-200 shadow-lg" data-testid="support-form-card">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-gray-800 flex items-center gap-2">
                  <MessageSquare size={20} className="text-emerald-600" />
                  Enviar Pedido de Suporte
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="support-form">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Nome Completo *
                      </label>
                      <Input
                        data-testid="input-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="O seu nome"
                        className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Email *
                      </label>
                      <Input
                        data-testid="input-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="seu@email.com"
                        className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Assunto *
                    </label>
                    <Input
                      data-testid="input-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Descreva brevemente o seu pedido"
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Category & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Categoria
                      </label>
                      <select
                        data-testid="select-category"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Prioridade
                      </label>
                      <select
                        data-testid="select-priority"
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Descrição *
                    </label>
                    <Textarea
                      data-testid="input-description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descreva o seu problema ou questão em detalhe. Quanto mais informação fornecer, mais rapidamente poderemos ajudar."
                      className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500 min-h-[150px]"
                      required
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Anexos (opcional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors bg-gray-50/50">
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
                        <Upload size={32} className="mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-1">
                          Arraste ficheiros ou <span className="text-emerald-600 font-medium">clique para selecionar</span>
                        </p>
                        <p className="text-xs text-gray-500">
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
                            className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200"
                            data-testid={`file-item-${index}`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText size={16} className="text-emerald-600" />
                              <span className="text-sm text-gray-700 truncate max-w-[200px]">
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-red-500"
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
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
                    data-testid="submit-button"
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
                      Autenticado como <span className="text-emerald-600 font-medium">{user?.email}</span>
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Light theme */}
          <div className="space-y-6">
            {/* Quick Links */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-800 text-lg">Ajuda Rápida</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <Link 
                  to="/help"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-emerald-50 transition-colors border border-gray-100 hover:border-emerald-200"
                  data-testid="link-help-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Book size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-gray-800 font-medium">Centro de Ajuda</div>
                    <div className="text-xs text-gray-500">FAQs e tutoriais</div>
                  </div>
                </Link>
                <Link 
                  to="/help/faqs"
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-amber-50 transition-colors border border-gray-100 hover:border-amber-200"
                  data-testid="link-faqs"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <HelpCircle size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-gray-800 font-medium">FAQs</div>
                    <div className="text-xs text-gray-500">Perguntas frequentes</div>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="border-b border-gray-100">
                <CardTitle className="text-gray-800 text-lg">Contactos Directos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Mail size={16} className="text-emerald-600" />
                  </div>
                  <span>support@kbex.io</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Phone size={16} className="text-emerald-600" />
                  </div>
                  <span>+41 (0) 800 KBEX</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Clock size={16} className="text-emerald-600" />
                  </div>
                  <span>24/7 para clientes VIP</span>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-gray-800 font-medium mb-1">Tempo de Resposta</div>
                    <div className="text-sm text-gray-600">
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
