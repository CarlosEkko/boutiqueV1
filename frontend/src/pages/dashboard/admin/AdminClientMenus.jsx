import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import { 
  Menu,
  LayoutDashboard,
  Wallet,
  Bitcoin,
  Banknote,
  History,
  TrendingUp,
  PieChart,
  Shield,
  UserCircle,
  User,
  Landmark,
  UserCheck,
  HelpCircle,
  ArrowDownUp,
  ArrowUpToLine,
  ArrowDownToLine,
  Send,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping
const iconMap = {
  LayoutDashboard,
  Wallet,
  Bitcoin,
  Banknote,
  History,
  TrendingUp,
  PieChart,
  Shield,
  UserCircle,
  User,
  Landmark,
  UserCheck,
  HelpCircle,
  ArrowDownUp,
  ArrowUpToLine,
  ArrowDownToLine,
  Send,
  Menu
};

const getIcon = (iconName) => {
  return iconMap[iconName] || Menu;
};

const AdminClientMenus = () => {
  const { token } = useAuth();
  const [menus, setMenus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [expandedSubmenus, setExpandedSubmenus] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  useEffect(() => {
    fetchMenuConfig();
  }, [token]);

  const fetchMenuConfig = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/client-menus/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(response.data.menus || {});
      setLastUpdated(response.data.updated_at);
      setUpdatedBy(response.data.updated_by);
      
      // Expand all menus by default
      const expanded = {};
      Object.keys(response.data.menus || {}).forEach(key => {
        expanded[key] = true;
      });
      setExpandedMenus(expanded);
    } catch (err) {
      console.error('Failed to fetch menu config:', err);
      toast.error('Erro ao carregar configuração de menus');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenu = (menuId, enabled) => {
    setMenus(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        enabled
      }
    }));
    setHasChanges(true);
  };

  const toggleSubmenu = (menuId, submenuId, enabled) => {
    setMenus(prev => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        submenus: prev[menuId].submenus?.map(sub =>
          sub.id === submenuId ? { ...sub, enabled } : sub
        )
      }
    }));
    setHasChanges(true);
  };

  const toggleItem = (menuId, itemId, enabled, submenuId = null) => {
    setMenus(prev => {
      if (submenuId) {
        // Item is inside a submenu
        return {
          ...prev,
          [menuId]: {
            ...prev[menuId],
            submenus: prev[menuId].submenus?.map(sub =>
              sub.id === submenuId
                ? {
                    ...sub,
                    items: sub.items?.map(item =>
                      item.id === itemId ? { ...item, enabled } : item
                    )
                  }
                : sub
            )
          }
        };
      } else {
        // Item is directly in the menu
        return {
          ...prev,
          [menuId]: {
            ...prev[menuId],
            items: prev[menuId].items?.map(item =>
              item.id === itemId ? { ...item, enabled } : item
            )
          }
        };
      }
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/client-menus/config`,
        menus,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Configuração de menus guardada com sucesso!');
      setHasChanges(false);
      fetchMenuConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao guardar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/client-menus/reset`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Menus restaurados para configuração padrão!');
      setShowResetDialog(false);
      setHasChanges(false);
      fetchMenuConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao restaurar menus');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpandMenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const toggleExpandSubmenu = (submenuId) => {
    setExpandedSubmenus(prev => ({
      ...prev,
      [submenuId]: !prev[submenuId]
    }));
  };

  const countEnabledItems = (menu) => {
    let total = 0;
    let enabled = 0;
    
    if (menu.items) {
      total += menu.items.length;
      enabled += menu.items.filter(i => i.enabled !== false).length;
    }
    
    if (menu.submenus) {
      menu.submenus.forEach(sub => {
        if (sub.items) {
          total += sub.items.length;
          enabled += sub.items.filter(i => i.enabled !== false).length;
        }
        if (sub.path) {
          total += 1;
          if (sub.enabled !== false) enabled += 1;
        }
      });
    }
    
    return { total, enabled };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-gold-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-client-menus">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Menu className="text-gold-400" />
            Menus de Clientes
          </h1>
          <p className="text-gray-400 mt-1">
            Configure quais menus e funcionalidades estão disponíveis para os clientes
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Última atualização: {new Date(lastUpdated).toLocaleString('pt-PT')} por {updatedBy}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            disabled={saving}
          >
            <RotateCcw size={16} className="mr-2" />
            Restaurar Padrão
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-gold-500 hover:bg-gold-400 text-black"
          >
            {saving ? (
              <Loader2 className="animate-spin mr-2" size={16} />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Guardar Alterações
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 text-sm">Tem alterações por guardar</span>
        </div>
      )}

      {/* Menu Cards */}
      <div className="space-y-4">
        {Object.entries(menus).map(([menuId, menu]) => {
          const Icon = getIcon(menu.icon);
          const isExpanded = expandedMenus[menuId];
          const counts = countEnabledItems(menu);
          const menuEnabled = menu.enabled !== false;
          
          return (
            <Card 
              key={menuId} 
              className={`border transition-all ${
                menuEnabled 
                  ? 'bg-zinc-900/50 border-gold-800/20' 
                  : 'bg-zinc-950/50 border-zinc-800/30 opacity-60'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => toggleExpandMenu(menuId)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="text-gray-400" size={20} />
                    ) : (
                      <ChevronRight className="text-gray-400" size={20} />
                    )}
                    <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
                      <Icon className="text-gold-400" size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{menu.label}</CardTitle>
                      <p className="text-xs text-gray-500">
                        {counts.enabled}/{counts.total} itens ativos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={menuEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {menuEnabled ? <CheckCircle size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
                      {menuEnabled ? 'Ativo' : 'Desativado'}
                    </Badge>
                    <Switch
                      checked={menuEnabled}
                      onCheckedChange={(checked) => toggleMenu(menuId, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t border-zinc-800 pt-4 space-y-3">
                    {/* Direct items */}
                    {menu.items?.map(item => {
                      const ItemIcon = getIcon(item.icon);
                      const itemEnabled = item.enabled !== false && menuEnabled;
                      
                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            itemEnabled ? 'bg-zinc-800/50' : 'bg-zinc-900/30 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <ItemIcon className={itemEnabled ? 'text-gold-400' : 'text-gray-600'} size={18} />
                            <div>
                              <p className={itemEnabled ? 'text-white' : 'text-gray-500'}>{item.label}</p>
                              <p className="text-xs text-gray-600">{item.path}</p>
                            </div>
                          </div>
                          <Switch
                            checked={item.enabled !== false}
                            onCheckedChange={(checked) => toggleItem(menuId, item.id, checked)}
                            disabled={!menuEnabled}
                          />
                        </div>
                      );
                    })}
                    
                    {/* Submenus */}
                    {menu.submenus?.map(submenu => {
                      const SubIcon = getIcon(submenu.icon);
                      const submenuEnabled = submenu.enabled !== false && menuEnabled;
                      const isSubExpanded = expandedSubmenus[submenu.id];
                      
                      return (
                        <div key={submenu.id} className="space-y-2">
                          <div 
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              submenuEnabled ? 'bg-zinc-800/30' : 'bg-zinc-900/30 opacity-50'
                            }`}
                          >
                            <div 
                              className="flex items-center gap-3 cursor-pointer flex-1"
                              onClick={() => toggleExpandSubmenu(submenu.id)}
                            >
                              {submenu.items ? (
                                isSubExpanded ? (
                                  <ChevronDown className="text-gray-500" size={16} />
                                ) : (
                                  <ChevronRight className="text-gray-500" size={16} />
                                )
                              ) : (
                                <div className="w-4" />
                              )}
                              <SubIcon className={submenuEnabled ? 'text-gold-400' : 'text-gray-600'} size={18} />
                              <div>
                                <p className={submenuEnabled ? 'text-white' : 'text-gray-500'}>{submenu.label}</p>
                                {submenu.path && (
                                  <p className="text-xs text-gray-600">{submenu.path}</p>
                                )}
                              </div>
                            </div>
                            <Switch
                              checked={submenu.enabled !== false}
                              onCheckedChange={(checked) => toggleSubmenu(menuId, submenu.id, checked)}
                              disabled={!menuEnabled}
                            />
                          </div>
                          
                          {/* Submenu items */}
                          {isSubExpanded && submenu.items && (
                            <div className="ml-8 space-y-2">
                              {submenu.items.map(item => {
                                const ItemIcon = getIcon(item.icon);
                                const itemEnabled = item.enabled !== false && submenuEnabled;
                                
                                return (
                                  <div 
                                    key={item.id}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                      itemEnabled ? 'bg-zinc-800/50' : 'bg-zinc-900/30 opacity-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <ItemIcon className={itemEnabled ? 'text-gray-400' : 'text-gray-600'} size={16} />
                                      <div>
                                        <p className={`text-sm ${itemEnabled ? 'text-white' : 'text-gray-500'}`}>{item.label}</p>
                                        <p className="text-xs text-gray-600">{item.path}</p>
                                      </div>
                                    </div>
                                    <Switch
                                      checked={item.enabled !== false}
                                      onCheckedChange={(checked) => toggleItem(menuId, item.id, checked, submenu.id)}
                                      disabled={!submenuEnabled}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-zinc-900 border-gold-800/30">
          <DialogHeader>
            <DialogTitle className="text-white">Restaurar Menus</DialogTitle>
            <DialogDescription className="text-gray-400">
              Tem certeza que deseja restaurar os menus para a configuração padrão? 
              Todas as alterações personalizadas serão perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              className="border-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReset}
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <RotateCcw size={16} className="mr-2" />}
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClientMenus;
