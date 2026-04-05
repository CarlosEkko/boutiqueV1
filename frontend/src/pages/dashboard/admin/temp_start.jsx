import React, { useState, useEffect, lazy, Suspense } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { 
  Plus,
  Edit,
  Trash2,
  Search,
  FileText,
  Folder,
  Eye,
  EyeOff,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Book,
  Star,
  Upload,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../../utils/formatters';

// Lazy load the rich text editor
const RichTextEditor = lazy(() => import('../../../components/RichTextEditor'));

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminKnowledgeBase = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('articles');
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '', slug: '', description: '', icon: '', color: '#10b981', order: 0, is_active: true, image_url: '', parent_id: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Articles state
  const [articles, setArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: '', slug: '', summary: '', content: '', category_id: '', subcategory_id: '',
    tags: [], status: 'draft', is_featured: false, order: 0, cover_image: ''
  });
  const [articleFilter, setArticleFilter] = useState({ status: '', category_id: '', search: '' });
  const [tagInput, setTagInput] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');

  // Reset category form
  const resetCategoryForm = () => {
    setCategoryForm({
      name: '', slug: '', description: '', icon: '', color: '#10b981', order: 0, is_active: true, image_url: '', parent_id: ''
    });
    setEditingCategory(null);
  };

  // Reset article form
  const resetArticleForm = () => {
    setArticleForm({
      title: '', slug: '', summary: '', content: '', category_id: '', subcategory_id: '',
      tags: [], status: 'draft', is_featured: false, order: 0, cover_image: ''
    });
    setSelectedMainCategory('');
    setEditingArticle(null);
    setTagInput('');
  };

  // Open category modal for new
  const openNewCategoryModal = () => {
    resetCategoryForm();
    setShowCategoryModal(true);
  };

  // Open category modal for edit
  const openEditCategoryModal = (cat) => {
    editCategory(cat);
    setShowCategoryModal(true);
  };

  // Open article modal for new
  const openNewArticleModal = () => {
    resetArticleForm();
    setShowArticleModal(true);
  };

  // Open article modal for edit
  const openEditArticleModal = (article) => {
    loadArticle(article.id);
    setShowArticleModal(true);
  };

  useEffect(() => {
    fetchCategories();
    if (activeTab === 'articles') fetchArticles();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'articles') fetchArticles();
  }, [articleFilter]);

  // ==================== CATEGORIES ====================

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const saveCategory = async () => {
    try {
      // Clean up parent_id if empty
      const dataToSend = { ...categoryForm };
      if (!dataToSend.parent_id) {
        dataToSend.parent_id = null;
      }
      
      if (editingCategory) {
        await axios.put(`${API_URL}/api/kb/admin/categories/${editingCategory}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoria atualizada!');
      } else {
        await axios.post(`${API_URL}/api/kb/admin/categories`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoria criada!');
      }
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar categoria');
    }
  };

  const uploadCategoryImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de ficheiro não suportado. Use JPEG, PNG, GIF ou WebP.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ficheiro muito grande. Máximo 5MB.');
      return;
    }
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'general');
      
      const response = await axios.post(`${API_URL}/api/uploads/file`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });
      
      setCategoryForm({ ...categoryForm, image_url: response.data.url });
      toast.success('Imagem carregada!');
    } catch (err) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadArticleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de ficheiro não suportado.');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ficheiro muito grande. Máximo 5MB.');
      return;
    }
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'general');
      
      const response = await axios.post(`${API_URL}/api/uploads/file`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });
      
      setArticleForm({ ...articleForm, cover_image: response.data.url });
      toast.success('Imagem carregada!');
    } catch (err) {
      toast.error('Erro ao carregar imagem');
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm('Tem a certeza que quer eliminar esta categoria?')) return;
    try {
      await axios.delete(`${API_URL}/api/kb/admin/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Categoria eliminada!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar categoria');
    }
  };

  const editCategory = (cat) => {
    setEditingCategory(cat.id);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '',
      color: cat.color || '#10b981',
      order: cat.order || 0,
      is_active: cat.is_active !== false,
      image_url: cat.image_url || '',
      parent_id: cat.parent_id || ''
    });
  };

  // ==================== ARTICLES ====================

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (articleFilter.status) params.append('status', articleFilter.status);
      if (articleFilter.category_id) params.append('category_id', articleFilter.category_id);
      if (articleFilter.search) params.append('search', articleFilter.search);

      const response = await axios.get(`${API_URL}/api/kb/admin/articles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArticles(response.data);
    } catch (err) {
      console.error('Error fetching articles', err);
    } finally {
      setLoading(false);
    }
  };

  const loadArticle = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/admin/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const article = response.data;
      setEditingArticle(id);
      
      // Find the main category for this article
      const articleCat = categories.find(c => c.id === article.category_id);
      if (articleCat) {
        // If it's a subcategory, find its parent
        if (articleCat.parent_id) {
          setSelectedMainCategory(articleCat.parent_id);
          setArticleForm({
            title: article.title,
            slug: article.slug,
            summary: article.summary || '',
            content: article.content,
            category_id: article.category_id,
            subcategory_id: article.category_id,
            tags: article.tags || [],
            status: article.status,
            is_featured: article.is_featured || false,
            order: article.order || 0,
            cover_image: article.cover_image || ''
          });
        } else {
          // It's a main category
          setSelectedMainCategory(article.category_id);
          setArticleForm({
            title: article.title,
            slug: article.slug,
            summary: article.summary || '',
            content: article.content,
            category_id: article.category_id,
            subcategory_id: '',
            tags: article.tags || [],
            status: article.status,
            is_featured: article.is_featured || false,
            order: article.order || 0,
            cover_image: article.cover_image || ''
          });
        }
      } else {
        setArticleForm({
          title: article.title,
          slug: article.slug,
          summary: article.summary || '',
          content: article.content,
          category_id: article.category_id,
          subcategory_id: '',
          tags: article.tags || [],
          status: article.status,
          is_featured: article.is_featured || false,
          order: article.order || 0,
          cover_image: article.cover_image || ''
        });
      }
    } catch (err) {
      toast.error('Erro ao carregar artigo');
    }
  };

  const saveArticle = async () => {
    try {
      if (editingArticle) {
        await axios.put(`${API_URL}/api/kb/admin/articles/${editingArticle}`, articleForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Artigo atualizado!');
      } else {
        await axios.post(`${API_URL}/api/kb/admin/articles`, articleForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Artigo criado!');
      }
      setShowArticleModal(false);
      resetArticleForm();
      fetchArticles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar artigo');
    }
  };

  const deleteArticle = async (id) => {
    if (!window.confirm('Tem a certeza que quer eliminar este artigo?')) return;
    try {
      await axios.delete(`${API_URL}/api/kb/admin/articles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Artigo eliminado!');
      fetchArticles();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao eliminar artigo');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !articleForm.tags.includes(tagInput.trim())) {
      setArticleForm({ ...articleForm, tags: [...articleForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setArticleForm({ ...articleForm, tags: articleForm.tags.filter(t => t !== tag) });
  };

  const generateSlug = (title) => {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[-\s]+/g, '-')
      .trim();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Ajuda</h1>
          <p className="text-gray-400">Gerir categorias e artigos</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open('/help', '_blank')}
            variant="outline"
            className="border-zinc-700"
          >
            <Eye size={16} className="mr-2" />
            Ver Público
          </Button>
        </div>
      </div>

      {/* Tabs with Add buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'articles' ? 'default' : 'outline'}
            onClick={() => setActiveTab('articles')}
            className={activeTab === 'articles' ? 'bg-emerald-500' : 'border-zinc-700'}
          >
            <FileText size={16} className="mr-2" />
            Artigos ({articles.length})
          </Button>
          <Button
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            onClick={() => setActiveTab('categories')}
            className={activeTab === 'categories' ? 'bg-emerald-500' : 'border-zinc-700'}
          >
            <Folder size={16} className="mr-2" />
            Categorias ({categories.length})
          </Button>
        </div>
        
        {/* Add buttons */}
        <Button
          onClick={activeTab === 'categories' ? openNewCategoryModal : openNewArticleModal}
          className="bg-gold-500 hover:bg-gold-400 text-black"
        >
          <Plus size={16} className="mr-2" />
          {activeTab === 'categories' ? 'Nova Categoria' : 'Novo Artigo'}
        </Button>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Categorias Existentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Root categories (without parent) */}
              {categories.filter(cat => !cat.parent_id).map(cat => (
                <div key={cat.id}>
                  {/* Parent Category */}
                  <div
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}30` }}
                      >
                        <Folder size={16} style={{ color: cat.color }} />
                      </div>
                      <div>
                        <div className="text-white font-medium">{cat.name}</div>
                        <div className="text-xs text-gray-400">
                          /{cat.slug} • {cat.article_count || 0} artigos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!cat.is_active && (
                        <Badge className="bg-red-500/20 text-red-400 border-0">Inactiva</Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditCategoryModal(cat)}
                        className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCategory(cat.id)}
                        className="border-red-600/50 text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Subcategories */}
                  {categories.filter(sub => sub.parent_id === cat.id).map(subcat => (
                    <div
                      key={subcat.id}
                      className="flex items-center justify-between p-3 ml-8 mt-2 bg-zinc-800/30 rounded-lg border border-zinc-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-zinc-600 rounded-full mr-1"></div>
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${subcat.color}30` }}
                        >
                          <Folder size={14} style={{ color: subcat.color }} />
                        </div>
                        <div>
                          <div className="text-white text-sm">{subcat.name}</div>
                          <div className="text-xs text-gray-500">
                            /{subcat.slug} • {subcat.article_count || 0} artigos
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!subcat.is_active && (
                          <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Inactiva</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditCategoryModal(subcat)}
                          className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30 h-7 w-7 p-0"
                        >
                          <Edit size={12} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCategory(subcat.id)}
                          className="border-red-600/50 text-red-400 hover:bg-red-900/30 h-7 w-7 p-0"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Folder size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Nenhuma categoria criada ainda.</p>
                  <Button 
                    onClick={openNewCategoryModal}
                    className="mt-4 bg-gold-500 hover:bg-gold-400 text-black"
                  >
                    <Plus size={16} className="mr-2" />
                    Criar Primeira Categoria
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-white">Artigos</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Pesquisar..."
                  value={articleFilter.search}
                  onChange={(e) => setArticleFilter({ ...articleFilter, search: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white w-48"
                />
                <select
                  value={articleFilter.status}
                  onChange={(e) => setArticleFilter({ ...articleFilter, status: e.target.value })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Todos Status</option>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Arquivado</option>
                </select>
                <select
                  value={articleFilter.category_id}
                  onChange={(e) => setArticleFilter({ ...articleFilter, category_id: e.target.value })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Todas Categorias</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="border-zinc-700" onClick={fetchArticles}>
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-400">A carregar...</div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Book size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhum artigo encontrado</p>
                <Button 
                  onClick={openNewArticleModal}
                  className="mt-4 bg-gold-500 hover:bg-gold-400 text-black"
                >
                  <Plus size={16} className="mr-2" />
                  Criar Primeiro Artigo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map(article => (
                  <div
                    key={article.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{article.title}</span>
                        {article.is_featured && (
                          <Star size={14} className="text-gold-400 shrink-0" fill="currentColor" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span>{article.category_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {article.view_count}
                        </span>
                        <span>•</span>
                        <span>{formatDate(article.updated_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge className={`border-0 ${
                        article.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                        article.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {article.status === 'published' ? 'Publicado' :
                         article.status === 'draft' ? 'Rascunho' : 'Arquivado'}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditArticleModal(article)}
                        className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteArticle(article.id)}
                        className="border-red-600/50 text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
