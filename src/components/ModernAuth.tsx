import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, AlertCircle, Loader, Eye, EyeOff, Building2, ArrowRight,
  ShieldCheck, FileText, Settings, Users, Briefcase, Landmark, TrendingUp, Check, Sparkles, Sliders
} from 'lucide-react';
import firebaseAuthService, { AuthUser } from '../services/firebaseAuthService';
import { IDENTITIES } from '../types';

interface ModernAuthProps {
  onLoginSuccess: (user: AuthUser) => void;
  customBackgroundUrl?: string;
  customLogoUrl?: string;
  customFrameColor?: string;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function ModernAuth({
  onLoginSuccess,
  customBackgroundUrl: customBackgroundUrlProp,
  customLogoUrl: customLogoUrlProp,
  customFrameColor: customFrameColorProp
}: ModernAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customFrameColor, setCustomFrameColor] = useState(customFrameColorProp?.trim() || '#9B7D48');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoRoles, setShowDemoRoles] = useState(false); // Collapsed by default for clean branding
  
  const defaultLogo = 'https://i.imgur.com/Om0LsC2.png';
  const [customBrandLogoUrl, setCustomBrandLogoUrl] = useState(customLogoUrlProp?.trim() || defaultLogo);

  const loadSystemSettings = () => {
    const raw = localStorage.getItem('ca_system_settings');
    if (!raw) return;
    try {
      const settings = JSON.parse(raw);
      if (typeof settings.customLogoUrl === 'string' && settings.customLogoUrl.trim()) {
        setCustomBrandLogoUrl(settings.customLogoUrl.trim());
      }
      if (typeof settings.customFrameColor === 'string' && settings.customFrameColor.trim()) {
        setCustomFrameColor(settings.customFrameColor.trim());
      }
    } catch {
      // ignore invalid settings
    }
  };

  useEffect(() => {
    loadSystemSettings();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ca_system_settings') {
        loadSystemSettings();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    setCustomFrameColor(customFrameColorProp || '#9B7D48');
  }, [customFrameColorProp]);

  useEffect(() => {
    setCustomBrandLogoUrl(customLogoUrlProp?.trim() || defaultLogo);
  }, [customLogoUrlProp]);

  // Login form
  const [loginIdentity, setLoginIdentity] = useState(IDENTITIES[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identity, setIdentity] = useState(IDENTITIES[0]);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await firebaseAuthService.login(email, password);
      const userWithIdentity = {
        ...result.user,
        portal_identity: result.user.portal_identity || loginIdentity
      };
      firebaseAuthService.setUser(userWithIdentity);
      onLoginSuccess(userWithIdentity);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await firebaseAuthService.register(email, password, firstName, lastName, identity, profilePicture);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile picture must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Profile picture must be an image file');
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await firebaseAuthService.requestPasswordReset(resetEmail);
      setMode('reset-password');
      setError('Check your email for password reset instructions.');
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmResetPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      setMode('login');
      setError('Please use the link in your email to reset your password');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // High-fidelity profile role visual specifications
  const rolesSpecs = [
    { id: 'Initiator', title: 'Initiator', desc: 'Log funding folders', icon: FileText, textCol: 'text-[#9B7D48]' },
    { id: 'Line Manager', title: 'Line Manager', desc: 'Verify allocations', icon: Users, textCol: 'text-emerald-700' },
    { id: 'Internal Control', title: 'Auditor', desc: 'Compliance audit', icon: ShieldCheck, textCol: 'text-teal-700' },
    { id: 'Executive Director', title: 'Executive', desc: 'Ultimate clearance', icon: TrendingUp, textCol: 'text-sky-700' },
    { id: 'Finance', title: 'Finance', desc: 'Debit disbursements', icon: Landmark, textCol: 'text-amber-700' },
    { id: 'IT Support', title: 'IT Support', desc: 'Configure guidelines', icon: Settings, textCol: 'text-[#3E3E3B]' }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F4F7] text-[#3E3E3B] flex overflow-hidden relative font-sans">
      
      {/* Decorative Warm Beige background accents */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-[#CEC9BF]/15 rounded-full filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-1/3 w-1/2 h-1/2 bg-[#CEC9BF]/10 rounded-full filter blur-[150px] pointer-events-none z-0"></div>

      {/* LEFT SHOWCASE PANEL - Deep Forest Green (#111E1E) base with premium elegant gold vibes */}
      <div 
        className="w-0 lg:w-[46%] xl:w-[50%] shrink-0 h-full relative overflow-hidden hidden lg:flex flex-col justify-between p-12 md:p-16 border-r border-[#CEC9BF] bg-[#111E1E] select-none"
      >
        {/* Soft luxury gold radial mask starting from bottom center to give depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#111E1E] via-[#111E1E] to-[#9B7D48]/20 pointer-events-none z-0"></div>
        
        {/* Classic minimal grid line to enhance elite corporate aesthetics */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(206,201,191,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(206,201,191,0.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        ></div>

        {/* Visual Content: Header Logo */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="h-11 flex items-center justify-center shrink-0 p-2 bg-white/95 rounded-xl border border-[#CEC9BF]/50 shadow-md">
            <img 
              src={customBrandLogoUrl} 
              alt="Brand Logo" 
              className="h-full object-contain" 
              referrerPolicy="no-referrer"
              onError={(event) => { (event.currentTarget as HTMLImageElement).src = defaultLogo; }} 
            />
          </div>
          <div>
            <h2 className="font-sans font-black text-sm tracking-[0.2em] text-white leading-none">VETIVA</h2>
            <p className="text-[9px] mt-1 tracking-[0.15em] font-mono text-[#CEC9BF] font-extrabold uppercase leading-none">INTERNAL MEMO PORTAL</p>
          </div>
        </div>

        {/* Visual Content: Enterprise Highlights */}
        <div className="relative z-10 my-auto max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#9B7D48]/15 border-l-2 border-[#9B7D48] px-3 py-1 text-[10px] font-bold tracking-widest font-mono text-[#9B7D48] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#9B7D48]" /> Premium Enterprise Allocation
            </div>
            
            <h1 className="text-3xl xl:text-4.5xl font-black text-white font-sans tracking-tight leading-tight">
              Corporate Control & <span className="bg-gradient-to-r from-white via-[#CEC9BF] to-[#9B7D48] bg-clip-text text-transparent underline decoration-[#9B7D48]/40 decoration-wavy">Fiscal Accountability</span>
            </h1>
            
            <p className="text-sm text-[#848580] leading-relaxed font-sans">
              Our secure financial gateway ensures rigid organizational structure checks, multi-tiered screening guidelines, automated warning limits, and permanent action trace audits. 
            </p>
          </div>

          {/* Structured Showcase Items in Warm elegant container */}
          <div className="space-y-4 pt-6 border-t border-[#CEC9BF]/20">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white/5 border border-[#CEC9BF]/10 text-slate-300 shadow-sm">
                <FileText className="w-4.5 h-4.5 text-[#9B7D48]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">Authorized Expenditures Routing</h4>
                <p className="text-[11px] text-[#848580] leading-relaxed mt-0.5">Automated workflow checks, matching file structures, and role clearances inside our digital memo repository.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-white/5 border border-[#CEC9BF]/10 text-slate-300 shadow-sm">
                <ShieldCheck className="w-4.5 h-4.5 text-[#9B7D48]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-sans">Guaranteed Audit Trails</h4>
                <p className="text-[11px] text-[#848580] leading-relaxed mt-0.5">Every stage verification, internal manager assessment, and director authorization is forever logged with precise UTC timestamps.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Content: Footer */}
        <div className="relative z-10 text-[9.5px] text-[#848580] font-bold tracking-widest font-mono flex justify-between items-center border-t border-white/10 pt-4">
          <span>© 2026 VETIVA CAPITAL CAPITAL</span>
          <div className="flex items-center gap-1.5 uppercase text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9B7D48] animate-pulse"></span>
            <span>SECURE SYSTEMACTIVE</span>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL - Soft Off-White (#F3F4F7) background with beautiful card controls */}
      <div className="flex-1 min-h-screen bg-[#F3F4F7] overflow-y-auto px-6 md:px-16 py-12 flex flex-col justify-center relative z-10">
        
        <div className="w-full max-w-md mx-auto space-y-8">
          
          {/* Form Header */}
          <div className="space-y-3">
            {/* Logo on mobile view (hidden on desktop) */}
            <div className="lg:hidden flex items-center gap-2 mb-6 select-none">
              <div className="h-9 flex items-center justify-center shrink-0 p-1.5 bg-white border border-[#CEC9BF] rounded-xl shadow-xs">
                <img 
                  src={customBrandLogoUrl} 
                  alt="Logo" 
                  className="h-full object-contain" 
                  onError={(event) => { (event.currentTarget as HTMLImageElement).src = defaultLogo; }} 
                />
              </div>
              <span className="font-sans font-black text-xs tracking-widest uppercase text-[#3E3E3B]">VETIVA</span>
            </div>

            <h2 className="text-2xl md:text-3xl font-sans font-black text-[#3E3E3B] tracking-tight leading-none">
              {mode === 'login' && 'Authorized Access Gate'}
              {mode === 'register' && 'Setup Corporate Register'}
              {mode === 'forgot-password' && 'Recover Identity Vault'}
              {mode === 'reset-password' && 'Establish Access Credentials'}
            </h2>
            <p className="text-xs text-[#848580] leading-relaxed max-w-sm">
              {mode === 'login' && 'Enter your verified login address and passwords below to establish your secure sessions.'}
              {mode === 'register' && 'Add an administrative record. Specify profile rules and choose your department category.'}
              {mode === 'forgot-password' && 'Enter your registered email below to receive credential recovery options.'}
              {mode === 'reset-password' && 'Update your passwords and establish fresh credentials for your staff files.'}
            </p>
          </div>

          {/* Validation Alert notifications */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-3 text-rose-800 text-xs animate-fade-in shadow-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-600" />
              <div className="min-w-0 flex-1 leading-relaxed">
                <strong>Attention Required:</strong> {error}
              </div>
              <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800 font-mono text-base max-h-4 leading-none font-bold shrink-0 ml-1">×</button>
            </div>
          )}

          {/* DYNAMIC FORMS CONTROLLER */}
          
          {/* MODE 1: SECURED LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Discrete Sandbox Quick roles dropdown - Hiding them behind a sleek toggle for developer comfort */}
              <div className="bg-white border border-[#CEC9BF] rounded-2xl p-4 shadow-sm transition-all">
                <button
                  type="button"
                  onClick={() => setShowDemoRoles(!showDemoRoles)}
                  className="w-full flex items-center justify-between text-left select-none cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#9B7D48]" />
                    <span className="text-xs font-bold text-[#3E3E3B] tracking-tight">Quick Sandbox Roles filling</span>
                  </div>
                  <div className="px-2 py-0.5 bg-[#F3F4F7] border border-[#CEC9BF] rounded-full text-[10px] font-bold text-[#9B7D48]">
                    {showDemoRoles ? 'Hide Panel' : 'Click to Expand'}
                  </div>
                </button>

                {showDemoRoles && (
                  <div className="mt-3.5 pt-3 border-t border-[#F3F4F7] space-y-2 animate-fade-in text-left">
                    <p className="text-[10px] text-[#848580] leading-relaxed mb-2">
                      Select a role to populate preview login details. In a live environment, these are managed strictly via credentials.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {rolesSpecs.map((role) => {
                        const isSelected = loginIdentity === role.id;
                        const IconComp = role.icon;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              setLoginIdentity(role.id);
                              // Auto populate mock demo emails/passwords based on selection to make testing a delight!
                              if (role.id === 'Initiator') {
                                setEmail('initiator@corporate.com');
                                setPassword('vat_password_init');
                              } else if (role.id === 'IT Support') {
                                setEmail('itsupport@corporate.com');
                                setPassword('admin_security_key');
                              } else if (role.id === 'Line Manager') {
                                setEmail('linemanager@corporate.com');
                                setPassword('vat_manager_secret');
                              } else if (role.id === 'Internal Control') {
                                setEmail('internalcontrol@corporate.com');
                                setPassword('vat_internal_audit');
                              } else if (role.id === 'Executive Director') {
                                setEmail('executivedirector@corporate.com');
                                setPassword('vat_exec_clearance');
                              } else if (role.id === 'Finance') {
                                setEmail('finance@corporate.com');
                                setPassword('vat_finance_ledger');
                              }
                            }}
                            className={`p-2 rounded-xl border transition-all text-left cursor-pointer ${
                              isSelected 
                                ? 'bg-[#9B7D48]/10 border-[#9B7D48] text-[#3E3E3B] font-bold' 
                                : 'bg-[#F3F4F7]/40 border-[#CEC9BF]/40 text-[#848580] hover:bg-white hover:border-[#CEC9BF]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <IconComp className={`w-3.5 h-3.5 ${role.textCol}`} />
                              <span className="text-[10px] font-bold truncate">{role.title}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Input Field */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">
                  Identity Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#848580]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-10 pr-4 py-3 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] font-medium placeholder-[#848580]/50 transition-all font-sans"
                    placeholder="name@organization.com"
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold uppercase tracking-wider font-mono">
                  <span className="text-[#3E3E3B]">Securing Key</span>
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot-password')}
                    className="text-[#9B7D48] hover:text-[#81683B] transition-colors underline font-sans lowercase font-normal"
                  >
                    Forgot passcode?
                  </button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#848580]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-10 pr-10 py-3 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] font-medium placeholder-[#848580]/50 transition-all font-sans"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#848580] hover:text-[#3E3E3B] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secure Sign In Action Button using Muted Gold (#9B7D48) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-sans font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4.5 h-4.5 animate-spin text-white" />
                    Checking access ledger...
                  </>
                ) : (
                  <>
                    <span>Enter Vault Identity</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Alternate state selectors footer */}
              <div className="pt-4 border-t border-[#CEC9BF]/60 text-center flex items-center justify-center text-xs">
                <span className="text-[#848580]">Registering a brand new staff record? </span>
                <button 
                  type="button" 
                  onClick={() => setMode('register')} 
                  className="text-[#9B7D48] font-bold hover:text-[#81683B] transition-colors underline ml-1 cursor-pointer font-sans"
                >
                  Create Record
                </button>
              </div>

            </form>
          )}

          {/* MODE 2: PROFILE REGISTRATION */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Tina"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Ofeno"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Organizational Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="name@vetivagroup.com"
                />
              </div>

              {/* Portal identity grid selection */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Choose Department Class</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {rolesSpecs.map((role) => {
                    const isSelected = identity === role.id;
                    const IconComp = role.icon;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setIdentity(role.id)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected 
                            ? 'bg-white border-[#9B7D48] ring-1 ring-[#9B7D48]/30 text-[#3E3E3B]' 
                            : 'bg-white/40 border-[#CEC9BF] text-[#848580] hover:text-[#3E3E3B] hover:bg-white'
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#9B7D48]' : 'text-[#848580]'}`} />
                        <span className="text-[10px] font-bold truncate">{role.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Profile Avatar (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="w-full bg-white border border-[#CEC9BF] rounded-xl px-3 py-2 text-[#3E3E3B] text-[11px] file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[#9B7D48]/10 file:text-[#9B7D48] hover:file:bg-[#9B7D48]/20 transition-all cursor-pointer"
                    />
                  </div>
                  {profilePicturePreview && (
                    <div className="shrink-0 bg-white p-0.5 rounded-full border border-[#CEC9BF]">
                      <img src={profilePicturePreview} alt="Preview" className="h-10 h-10 w-10 rounded-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Min. 8 keys"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Confirm Key</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Repeat keys"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    <span>Saving official record...</span>
                  </>
                ) : (
                  <span>Register Identity & Login</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-[#3E3E3B] py-1 transition-all underline cursor-pointer"
              >
                Already have an identity record? <span className="text-[#9B7D48] font-bold">Sign in instead</span>
              </button>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-[#3E3E3B] uppercase tracking-widest font-mono">
                  Registered Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#848580]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-10 pr-4 py-3 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="your@vetivagroup.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Sending password instructions...</span>
                  </>
                ) : (
                  <span>Send Recovery Instructions</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-[#9B7D48] transition-colors py-1 cursor-pointer underline"
              >
                Return to Access gateway
              </button>

            </form>
          )}

          {/* MODE 4: RESET PASSWORD FORM */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Reset Code Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Insert secure reset code code from email"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">New Secret Key</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Enter secure new password"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Confirm Secret Key</label>
                <input
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Repeat new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Committing new password...' : 'Override Key & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-slate-250 py-1 cursor-pointer underline hover:text-[#9B7D48] transition-colors"
              >
                Back to Login gate
              </button>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}
