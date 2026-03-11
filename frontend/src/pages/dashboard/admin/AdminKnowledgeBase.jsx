import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Textarea } from '../../../components/ui/textarea';
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
  Star
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminKnowledgeBase = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('articles');
  const [loading, setLoading] = useState(false);
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '', slug: '', description: '', icon: '', color: '#10b981', order: 0, is_active: true
  });
  
  // Articles state
  const [articles, setArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleForm, setArticleForm] = useState({
    title: '', slug: '', summary: '', content: '', category_id: '', 
    tags: [], status: 'draft', is_featured: false, order: 0
  });
  const [articleFilter, setArticleFilter] = useState({ status: '', category_id: '', search: '' });
  const [tagInput, setTagInput] = useState('');

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
      if (editingCategory) {
        await axios.put(`${API_URL}/api/kb/admin/categories/${editingCategory}`, categoryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoria atualizada!');
      } else {
        await axios.post(`${API_URL}/api/kb/admin/categories`, categoryForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoria criada!');
      }
      setEditingCategory(null);
      setCategoryForm({ name: '', slug: '', description: '', icon: '', color: '#10b981', order: 0, is_active: true });
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar categoria');
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
      is_active: cat.is_active !== false
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
      setArticleForm({
        title: article.title,
        slug: article.slug,
        summary: article.summary || '',
        content: article.content,
        category_id: article.category_id,
        tags: article.tags || [],
        status: article.status,
        is_featured: article.is_featured || false,
        order: article.order || 0
      });
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
      setEditingArticle(null);
      setArticleForm({
        title: '', slug: '', summary: '', content: '', category_id: '',
        tags: [], status: 'draft', is_featured: false, order: 0
      });
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
          <h1 className="text-2xl font-bold text-white">Base de Conhecimento</h1>
          <p className="text-gray-400">Gerir categorias e artigos</p>
        </div>
        <Button
          onClick={() => window.open('/help', '_blank')}
          variant="outline"
          className="border-zinc-700"
        >
          <Eye size={16} className="mr-2" />
          Ver Público
        </Button>
      </div>

      {/* Tabs */}
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Form */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Nome</label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => {
                    setCategoryForm({ 
                      ...categoryForm, 
                      name: e.target.value,
                      slug: editingCategory ? categoryForm.slug : generateSlug(e.target.value)
                    });
                  }}
                  placeholder="Nome da categoria"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Slug (URL)</label>
                <Input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="categoria-url"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Descrição</label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Descrição breve"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Ícone</label>
                  <Input
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                    placeholder="blog, faqs, learn..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Cor</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Ordem</label>
                  <Input
                    type="number"
                    value={categoryForm.order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    Activa
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveCategory} className="bg-emerald-500 hover:bg-emerald-600 flex-1">
                  <Save size={16} className="mr-2" />
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </Button>
                {editingCategory && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', slug: '', description: '', icon: '', color: '#10b981', order: 0, is_active: true });
                    }}
                    className="border-zinc-700"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Categorias Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div
                    key={cat.id}
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
                          /{cat.slug} • {cat.article_count} artigos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!cat.is_active && (
                        <Badge className="bg-red-500/20 text-red-400 border-0">Inactiva</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editCategory(cat)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(cat.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <div className="space-y-6">
          {/* Article Editor */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">
                {editingArticle ? 'Editar Artigo' : 'Novo Artigo'}
              </CardTitle>
              {editingArticle && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingArticle(null);
                    setArticleForm({
                      title: '', slug: '', summary: '', content: '', category_id: '',
                      tags: [], status: 'draft', is_featured: false, order: 0
                    });
                  }}
                  className="border-zinc-700"
                >
                  <Plus size={14} className="mr-1" />
                  Novo
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Título</label>
                  <Input
                    value={articleForm.title}
                    onChange={(e) => {
                      setArticleForm({
                        ...articleForm,
                        title: e.target.value,
                        slug: editingArticle ? articleForm.slug : generateSlug(e.target.value)
                      });
                    }}
                    placeholder="Título do artigo"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Slug (URL)</label>
                  <Input
                    value={articleForm.slug}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                    placeholder="artigo-url"
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Categoria</label>
                  <select
                    value={articleForm.category_id}
                    onChange={(e) => setArticleForm({ ...articleForm, category_id: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Selecionar...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Status</label>
                  <select
                    value={articleForm.status}
                    onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={articleForm.is_featured}
                      onChange={(e) => setArticleForm({ ...articleForm, is_featured: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Star size={14} className="text-gold-400" />
                    Destaque
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Resumo</label>
                <Textarea
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                  placeholder="Breve resumo do artigo (aparece nas listagens)"
                  className="bg-zinc-800 border-zinc-700 text-white"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Conteúdo (Markdown)</label>
                <Textarea
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="# Título&#10;&#10;Conteúdo do artigo em **Markdown**..."
                  className="bg-zinc-800 border-zinc-700 text-white font-mono"
                  rows={12}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Tags</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Adicionar tag..."
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                  <Button onClick={addTag} variant="outline" className="border-zinc-700">
                    <Plus size={14} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {articleForm.tags.map(tag => (
                    <Badge
                      key={tag}
                      className="bg-zinc-800 text-gray-300 border-zinc-700 cursor-pointer hover:bg-red-500/20"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X size={12} className="ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>

              <Button onClick={saveArticle} className="bg-emerald-500 hover:bg-emerald-600 w-full">
                <Save size={16} className="mr-2" />
                {editingArticle ? 'Atualizar Artigo' : 'Criar Artigo'}
              </Button>
            </CardContent>
          </Card>

          {/* Articles List */}
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
                <div className="text-center py-8 text-gray-400">
                  <Book size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum artigo encontrado</p>
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
                          <span>{new Date(article.updated_at).toLocaleDateString('pt-PT')}</span>
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
                          variant="ghost"
                          size="sm"
                          onClick={() => loadArticle(article.id)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteArticle(article.id)}
                          className="text-red-400 hover:text-red-300"
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
        </div>
      )}
    </div>
  );
};

export default AdminKnowledgeBase;
