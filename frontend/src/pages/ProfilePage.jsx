import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Phone, Globe, LogOut, ArrowLeft, Edit2, Save, X, Shield, Calendar } from 'lucide-react';

const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'España' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italia' },
  { code: 'CH', name: 'Schweiz / Suisse' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' }
];

const ProfilePage = () => {
  const { user, loading, isAuthenticated, logout, updateProfile } = useAuth();
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    country: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  // Populate form when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        country: user.country || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (value) => {
    setFormData(prev => ({ ...prev, country: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(formData);
      toast.success(t('profile.updateSuccess') || 'Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      phone: user?.phone || '',
      country: user?.country || ''
    });
    setEditing(false);
  };

  const handleLogout = () => {
    logout();
    toast.success(t('auth.logoutSuccess') || 'Logged out successfully!');
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCountryName = (code) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-gold-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={`min-h-screen bg-black py-12 px-4 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-black to-black" />

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-gray-400 hover:text-gold-400 transition-colors"
            data-testid="back-to-home"
          >
            <ArrowLeft size={20} />
            <span>{t('profile.backToHome') || 'Back to Home'}</span>
          </Link>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-amber-900/30 text-gold-400 hover:bg-amber-900/30 hover:text-amber-300"
            data-testid="logout-button"
          >
            <LogOut size={18} className="mr-2" />
            {t('auth.logout') || 'Logout'}
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-900/30">
          <CardHeader className="text-center pb-4">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24 bg-gradient-to-br from-gold-500 to-gold-600">
                <AvatarFallback className="text-2xl text-white bg-gradient-to-br from-gold-500 to-gold-600">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <CardTitle className="text-2xl font-light text-white">
              {user.name}
            </CardTitle>
            <p className="text-gray-400">{user.email}</p>
            
            {/* Status badge */}
            <div className="flex justify-center mt-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full">
                <Shield size={14} />
                {t('profile.verified') || 'Verified Member'}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Edit/Save buttons */}
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                    data-testid="cancel-edit-button"
                  >
                    <X size={16} className="mr-1" />
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="bg-gold-500 hover:bg-gold-400 text-white"
                    data-testid="save-profile-button"
                  >
                    <Save size={16} className="mr-1" />
                    {saving ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="border-amber-900/30 text-gold-400 hover:bg-amber-900/30"
                  data-testid="edit-profile-button"
                >
                  <Edit2 size={16} className="mr-1" />
                  {t('profile.edit') || 'Edit Profile'}
                </Button>
              )}
            </div>

            {/* Profile fields */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <User size={16} className="text-gold-400" />
                  {t('profile.fullName') || 'Full Name'}
                </Label>
                {editing ? (
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-zinc-800/50 border-amber-900/30 text-white focus:border-gold-400"
                    data-testid="profile-name-input"
                  />
                ) : (
                  <p className="text-white py-2 px-3 bg-zinc-800/30 rounded-md">{user.name}</p>
                )}
              </div>

              {/* Email - readonly */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Mail size={16} className="text-gold-400" />
                  {t('profile.email') || 'Email'}
                </Label>
                <p className="text-white py-2 px-3 bg-zinc-800/30 rounded-md flex items-center justify-between">
                  {user.email}
                  <span className="text-xs text-gray-500">{t('profile.cannotChange') || 'Cannot be changed'}</span>
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Phone size={16} className="text-gold-400" />
                  {t('profile.phone') || 'Phone Number'}
                </Label>
                {editing ? (
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+351 912 345 678"
                    className="bg-zinc-800/50 border-amber-900/30 text-white placeholder:text-gray-500 focus:border-gold-400"
                    data-testid="profile-phone-input"
                  />
                ) : (
                  <p className="text-white py-2 px-3 bg-zinc-800/30 rounded-md">
                    {user.phone || <span className="text-gray-500">{t('profile.notProvided') || 'Not provided'}</span>}
                  </p>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Globe size={16} className="text-gold-400" />
                  {t('profile.country') || 'Country'}
                </Label>
                {editing ? (
                  <Select value={formData.country} onValueChange={handleCountryChange}>
                    <SelectTrigger 
                      className="bg-zinc-800/50 border-amber-900/30 text-white focus:border-gold-400"
                      data-testid="profile-country-select"
                    >
                      <SelectValue placeholder={t('profile.selectCountry') || 'Select your country'} />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-amber-900/30">
                      {COUNTRIES.map(country => (
                        <SelectItem 
                          key={country.code} 
                          value={country.code}
                          className="text-white hover:bg-amber-900/30 focus:bg-amber-900/30"
                        >
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-white py-2 px-3 bg-zinc-800/30 rounded-md">
                    {user.country 
                      ? getCountryName(user.country) 
                      : <span className="text-gray-500">{t('profile.notProvided') || 'Not provided'}</span>}
                  </p>
                )}
              </div>

              {/* Member since */}
              <div className="space-y-2 pt-4 border-t border-amber-900/20">
                <Label className="text-gray-300 flex items-center gap-2">
                  <Calendar size={16} className="text-gold-400" />
                  {t('profile.memberSince') || 'Member Since'}
                </Label>
                <p className="text-white py-2 px-3 bg-zinc-800/30 rounded-md">
                  {formatDate(user.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
