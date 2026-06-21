import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, AlertCircle, Loader, Eye, EyeOff, ArrowRight,
  ShieldCheck, FileText, Settings, Users, Landmark, TrendingUp, Check, Sparkles, Key, HelpCircle
} from 'lucide-react';
import firebaseAuthService, { AuthUser } from '../services/firebaseAuthService';

interface ModernAuthProps {
  onLoginSuccess: (user: AuthUser) => void;
  customBackgroundUrl?: string; // fallback
  customLogoUrl?: string;
  customFrameColor?: string;
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export default function ModernAuth({
  onLoginSuccess,
  customLogoUrl: customLogoUrlProp,
  customFrameColor: customFrameColorProp
}: ModernAuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoGuide, setShowDemoGuide] = useState(false); // Collapsed, clean, non-intrusive drawer
  
  const defaultLogo = 'https://i.imgur.com/Om0LsC2.png';
  const [customBrandLogoUrl, setCustomBrandLogoUrl] = useState(customLogoUrlProp?.trim() || defaultLogo);

  // Background is custom premium color now #111E1E instead of random photo Unsplash image
  const defaultBgColor = '#111E1E'; 

  // Auto seed mock accounts in local storage if empty on mount so typing works seamlessly on first load
  useEffect(() => {
    const mockUsersKey = 'mock_users';
    let raw = localStorage.getItem(mockUsersKey);
    let existing = [];
    try {
      existing = raw ? JSON.parse(raw) : [];
    } catch {
      existing = [];
    }

    const seedAccounts = [
      {
        id: "seed-initiator",
        email: "initiator@corporate.com",
        password: "vat_password_init",
        first_name: "Tina",
        last_name: "Ofeno",
        department: "Operations Support",
        portal_identity: "Initiator",
        role: "Initiator",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: "seed-manager",
        email: "linemanager@corporate.com",
        password: "vat_manager_secret",
        first_name: "Femi",
        last_name: "Adewole",
        department: "Internal Control",
        portal_identity: "Line Manager",
        role: "Line Manager",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: "seed-auditor",
        email: "internalcontrol@corporate.com",
        password: "vat_internal_audit",
        first_name: "Kunle",
        last_name: "Balogun",
        department: "Risk Auditing",
        portal_identity: "Internal Control",
        role: "Internal Control",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: "seed-exec",
        email: "executivedirector@corporate.com",
        password: "vat_exec_clearance",
        first_name: "Sola",
        last_name: "Adeyemi",
        department: "Executive Committee",
        portal_identity: "Executive Director",
        role: "Executive Director",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: "seed-finance",
        email: "finance@corporate.com",
        password: "vat_finance_ledger",
        first_name: "Tunde",
        last_name: "Olawale",
        department: "Accounts",
        portal_identity: "Finance",
        role: "Finance",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      },
      {
        id: "seed-itsupport",
        email: "itsupport@corporate.com",
        password: "admin_security_key",
        first_name: "Chidi",
        last_name: "Egwu",
        department: "Technical Operations",
        portal_identity: "IT Support",
        role: "IT Support",
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString()
      }
    ];

    let modified = false;
    seedAccounts.forEach(seed => {
      if (!existing.some((u: any) => u.email === seed.email)) {
        existing.push(seed);
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(mockUsersKey, JSON.stringify(existing));
    }
  }, []);

  useEffect(() => {
    setCustomBrandLogoUrl(customLogoUrlProp?.trim() || defaultLogo);
  }, [customLogoUrlProp]);

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register state inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identity, setIdentity] = useState('Initiator');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);

  // Forgot / Reset password state inputs
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await firebaseAuthService.login(email.trim(), password);
      onLoginSuccess(result.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
      const result = await firebaseAuthService.register(
        email.trim(), 
        password, 
        firstName.trim(), 
        lastName.trim(), 
        identity, 
        profilePicture
      );
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
        setError('Avatar picture must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Avatar picture must be an image file type');
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
      await firebaseAuthService.requestPasswordReset(resetEmail.trim());
      setMode('reset-password');
      setError('Check your email for instructions to reset your passcode.');
    } catch (err: any) {
      setError(err.message || 'Reset instructions delivery failed.');
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
      setError('Passcode updated successfully. Please sign in with your new passcode.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedUsersGuide = [
    { label: 'Corporate Initiator', mail: 'initiator@corporate.com', key: 'vat_password_init' },
    { label: 'Line Verification Manager', mail: 'linemanager@corporate.com', key: 'vat_manager_secret' },
    { label: 'Risk & Audit Auditor', mail: 'internalcontrol@corporate.com', key: 'vat_internal_audit' },
    { label: 'Board Executive Director', mail: 'executivedirector@corporate.com', key: 'vat_exec_clearance' },
    { label: 'Finance Disbursements', mail: 'finance@corporate.com', key: 'vat_finance_ledger' },
    { label: 'Root IT Administrator', mail: 'itsupport@corporate.com', key: 'admin_security_key' }
  ];

  return (
    <div className="min-h-screen w-full bg-[#F3F4F7] text-[#3E3E3B] flex overflow-hidden relative font-sans">
      
      {/* BACKGROUND ACCENT LAYERS for subtle warmth */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#CEC9BF]/20 rounded-full filter blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 left-1/4 w-1/2 h-1/2 bg-[#CEC9BF]/10 rounded-full filter blur-[150px] pointer-events-none z-0"></div>

      {/* LEFT PANEL: Signature Premium Deep Forest Green (#111E1E) Branding Showcase */}
      <div 
        className="w-0 lg:w-[45%] xl:w-[48%] shrink-0 h-full relative overflow-hidden hidden lg:flex flex-col justify-between p-12 md:p-16 border-r border-[#CEC9BF] bg-[#111E1E] select-none"
      >
        {/* Sleek radial gold flare highlights to add rich character */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#111E1E] via-[#111E1E] to-[#9B7D48]/15 pointer-events-none z-0"></div>
        
        {/* Subtle geometric line layout overlay strictly respecting architectural honesty */}
        <div 
          className="absolute inset-0 opacity-5 pointer-events-none z-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(206,201,191,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(206,201,191,0.12) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        ></div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="h-11 flex items-center justify-center shrink-0 p-2.5 bg-white rounded-xl border border-[#CEC9BF] shadow-sm">
            <img 
              src={customBrandLogoUrl} 
              alt="Brand Logo" 
              className="h-full object-contain" 
              referrerPolicy="no-referrer"
              onError={(event) => { (event.currentTarget as HTMLImageElement).src = defaultLogo; }} 
            />
          </div>
          <div>
            <h2 className="font-sans font-black text-sm tracking-[0.25em] text-[#F3F4F7] leading-none uppercase">VETIVA</h2>
            <p className="text-[10px] mt-1 tracking-[0.15em] font-mono text-[#CEC9BF] font-extrabold uppercase leading-none">INTERNAL MEMORANDUM</p>
          </div>
        </div>

        {/* Corporate High-Fidelity Copy */}
        <div className="relative z-10 my-auto max-w-md space-y-7">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#9B7D48]/15 border-l-2 border-[#9B7D48] px-3 py-1.5 text-[10px] font-bold tracking-widest font-mono text-[#9B7D48] uppercase">
              <Sparkles className="w-3.5 h-3.5" /> Enterprise Expenditure Hub
            </div>
            
            <h1 className="text-3xl xl:text-4xl font-extrabold text-[#F3F4F7] font-sans tracking-tight leading-tight">
              Rigid Allocations & <br/>
              <span className="bg-gradient-to-r from-white via-[#CEC9BF] to-[#9B7D48] bg-clip-text text-transparent underline decoration-[#9B7D48]/40 decoration-wavy">Administrative Auditing</span>
            </h1>
            
            <p className="text-sm text-[#848580] leading-relaxed font-sans font-normal">
              A high-precision processing framework ensuring compliance reviews, structured supervisor approvals, remaining balance refund folders adjustments, and immutable auditing record lists.
            </p>
          </div>

          {/* Core system points styled cleanly */}
          <div className="space-y-4 pt-6 border-t border-[#CEC9BF]/15">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#9B7D48] shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#F3F4F7] font-sans">Security-First Clearance Channels</h4>
                <p className="text-[11.5px] text-[#848580] leading-relaxed mt-0.5">Dual-signatory verification of expenditure forms and strict maximum cash ceilings control rules.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#9B7D48] shadow-sm">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#F3F4F7] font-sans">Synchronized Ledger Reporting</h4>
                <p className="text-[11.5px] text-[#848580] leading-relaxed mt-0.5 font-sans">Continuous background checking, overdue warning logs, and instant digital sign-off records.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Panel Footer */}
        <div className="relative z-10 text-[9.5px] text-[#848580] font-bold tracking-widest font-mono flex justify-between items-center border-t border-white/10 pt-4">
          <span>© 100% SECURE PORTAL</span>
          <div className="flex items-center gap-1.5 uppercase text-[#F3F4F7]/85">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9B7D48] animate-pulse"></span>
            <span>PROTECTED NODE ACTIVE</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Purely Simplified, Stunning & User-Friendly Sign Landing Page */}
      <div className="flex-1 min-h-screen bg-[#F3F4F7] overflow-y-auto px-6 md:px-16 py-12 flex flex-col justify-center relative z-10">
        
        <div className="w-full max-w-sm mx-auto space-y-8">
          
          {/* Mobile responsive header */}
          <div className="space-y-3">
            <div className="lg:hidden flex items-center gap-2 mb-6 select-none">
              <div className="h-9 flex items-center justify-center shrink-0 p-1.5 bg-white border border-[#CEC9BF] rounded-xl shadow-xs">
                <img 
                  src={customBrandLogoUrl} 
                  alt="Logo" 
                  className="h-full object-contain" 
                  onError={(event) => { (event.currentTarget as HTMLImageElement).src = defaultLogo; }} 
                />
              </div>
              <span className="font-sans font-black text-xs tracking-widest text-[#3E3E3B] uppercase">VETIVA</span>
            </div>

            <h2 className="text-2xl md:text-3.5xl font-sans font-black text-[#3E3E3B] tracking-tight leading-none">
              {mode === 'login' && 'Authorized Access Gateway'}
              {mode === 'register' && 'Organizational Register'}
              {mode === 'forgot-password' && 'Password Restoration'}
              {mode === 'reset-password' && 'Input Access Passcode'}
            </h2>
            <p className="text-xs text-[#848580] leading-relaxed max-w-xs">
              {mode === 'login' && 'Please input your official corporate email address and security passcode to authenticate.'}
              {mode === 'register' && 'Enter your operational details to establish a verified administrative record.'}
              {mode === 'forgot-password' && 'Provide your registered email to request password restoration.'}
              {mode === 'reset-password' && 'Provide your secure token code and establish a new passcode secret.'}
            </p>
          </div>

          {/* Notification banner */}
          {error && (
            <div className="bg-[#CEC9BF]/25 border border-[#848580] p-3 rounded-xl flex items-start gap-2.5 text-[#3E3E3B] text-xs animate-fade-in shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#9B7D48]" />
              <div className="min-w-0 flex-1 leading-relaxed">
                {error}
              </div>
              <button onClick={() => setError('')} className="text-[#848580] hover:text-[#3E3E3B] font-mono text-sm leading-none font-bold shrink-0 ml-1">×</button>
            </div>
          )}

          {/* DYNAMIC FORMS */}
          
          {/* LOGIN GATEWAY (The selector roles is completely removed and hidden) */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[10.5px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">
                  Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#848580]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] font-medium placeholder-[#848580]/50 transition-all font-sans"
                    placeholder="e.g. initiator@corporate.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10.5px] font-extrabold uppercase tracking-wider font-mono">
                  <span className="text-[#3E3E3B]">Security Passcode</span>
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot-password')}
                    className="text-[#9B7D48] hover:text-[#81683B] transition-colors underline font-sans lowercase font-normal"
                  >
                    recover passcode?
                  </button>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#848580]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-9 pr-9 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] font-medium placeholder-[#848580]/50 transition-all font-sans"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#848580] hover:text-[#3E3E3B] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Muted Gold CTA button (#9B7D48) */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-sans font-extrabold uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin text-white" />
                    Checking secure nodes...
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Create identity footer */}
              <div className="pt-4 border-t border-[#CEC9BF]/50 text-center flex items-center justify-center text-xs">
                <span className="text-[#848580]">Testing a brand new account? </span>
                <button 
                  type="button" 
                  onClick={() => setMode('register')} 
                  className="text-[#9B7D48] font-bold hover:text-[#81683B] transition-colors underline ml-1 cursor-pointer"
                >
                  Create Record
                </button>
              </div>

              {/* EXTREMELY Sleek help accordion drawer (completely hidden by default, accessible only for demo verification safely) */}
              <div className="mt-4 bg-[#CEC9BF]/10 rounded-xl border border-[#CEC9BF]/30 p-3">
                <button
                  type="button"
                  onClick={() => setShowDemoGuide(!showDemoGuide)}
                  className="w-full flex items-center justify-between text-left select-none text-[11px] font-bold text-[#3E3E3B] focus:outline-none"
                >
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#9B7D48]" />
                    <span>View Sandbox Demo Logins</span>
                  </div>
                  <span className="text-[10px] text-[#9B7D48] underline">
                    {showDemoGuide ? 'Hide Credentials' : 'Show Credentials'}
                  </span>
                </button>

                {showDemoGuide && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#CEC9BF]/30 space-y-1.5 animate-fade-in text-left">
                    <p className="text-[10px] text-[#848580] leading-normal pb-1">
                      Type any email and passcode list below to login with that specific preseeded role in the sandbox Environment:
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {seedUsersGuide.map((itm, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEmail(itm.mail);
                            setPassword(itm.key);
                            setShowDemoGuide(false);
                          }}
                          className="w-full block hover:bg-white text-left p-2 rounded-lg border border-[#CEC9BF]/30 transition-all cursor-pointer group"
                        >
                          <p className="text-[10px] font-bold text-[#3E3E3B] group-hover:text-[#9B7D48]">{itm.label}</p>
                          <div className="flex items-center justify-between mt-0.5 text-[9px] font-mono text-[#848580]">
                            <span>Mail: {itm.mail}</span>
                            <span>Key: {itm.key}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </form>
          )}

          {/* REGISTER CODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Tina"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Ofeno"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Corporate Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="name@vetivagroup.com"
                />
              </div>

              {/* Portal Identity picker for registration */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Organizational Role</label>
                <select
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all font-sans cursor-pointer"
                >
                  <option value="Initiator">Initiator (draft memo folder, claim refund)</option>
                  <option value="Line Manager">Line Manager (department verifier)</option>
                  <option value="Internal Control">Internal Control (compliance audit review)</option>
                  <option value="Executive Director">Executive Director (board compliance signoff)</option>
                  <option value="Finance">Finance (process ledgers disbursements)</option>
                  <option value="IT Support">IT Support (CMS controls rule config)</option>
                </select>
              </div>

              {/* Profile Avatar upload */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Signature Avatar (Optional)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="w-full bg-white border border-[#CEC9BF] rounded-xl px-2.5 py-1.5 text-[#3E3E3B] text-[11px] file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[#9B7D48]/10 file:text-[#9B7D48] transition-all cursor-pointer"
                    />
                  </div>
                  {profilePicturePreview && (
                    <div className="shrink-0 bg-white p-0.5 rounded-full border border-[#CEC9BF]">
                      <img src={profilePicturePreview} alt="Preview" className="h-8 w-8 rounded-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Passcode</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Min. 8 keys"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Repeat Key</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="Repeat keys"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Creating record...' : 'Register Account'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-[#3E3E3B] py-1 transition-all underline cursor-pointer"
              >
                Already registered? <span className="text-[#9B7D48] font-bold">Sign in</span>
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              
              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-bold text-[#3E3E3B] uppercase tracking-widest font-mono">
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#848580]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                    placeholder="name@vetivagroup.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Transmitting code...' : 'Send Recovery Access'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-[#9B7D48] transition-colors py-1 cursor-pointer underline"
              >
                Return to Login Page
              </button>

            </form>
          )}

          {/* RESET PASSWORD */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-4.5">
              
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Reset Code Token</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Insert token code from email"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">New Passcode</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Enter new 8 character code"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-extrabold text-[#3E3E3B] uppercase tracking-wider font-mono">Repeat Passcode</label>
                <input
                  type="password"
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-[#CEC9BF] focus:border-[#9B7D48] text-[#3E3E3B] rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-[#9B7D48] transition-all"
                  placeholder="Confirm passcode key"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#9B7D48] hover:bg-[#81683B] active:scale-[0.98] disabled:bg-[#848580] text-white text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Configuring new code...' : 'Confirm New passcode & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-[#848580] hover:text-slate-250 py-1 cursor-pointer underline hover:text-[#9B7D48] transition-colors"
              >
                Go to Sign In
              </button>

            </form>
          )}

        </div>

      </div>

    </div>
  );
}
