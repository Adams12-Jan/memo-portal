import React, { useState, useEffect } from 'react';
import { 
  Mail, Calendar, Eye, RefreshCw, Save, Sparkles, Send, Paintbrush,
  Users, Trash2, Clock, CheckCircle2, UserPlus, FileCode, Check, 
  ChevronRight, Laptop, Smartphone, HelpCircle, ShieldAlert 
} from 'lucide-react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { EmailTemplate, SentEmail, UserRole, DEPARTMENTS, SystemCustomSettings } from '../types';
import authClient, { AuthUser } from '../services/authClient';
import cmsClient from '../services/cmsClient';
import { Palette, Wrench, ShieldCheck } from 'lucide-react';

interface CmsPortalProps {
  templates: EmailTemplate[];
  onSaveTemplate: (template: EmailTemplate) => void;
  onResetTemplates: () => void;
  sentEmails: SentEmail[];
  onClearSentEmails: () => void;
  staffMembers: { name: string; role: UserRole; department: string }[];
  onUpdateStaffMembers: (nextStaff: { name: string; role: UserRole; department: string }[]) => void;
  onSimulateReminders: (overdueDays: number) => void;
  onResetFactoryDefault: () => void;
  advances: any[];
  retirements: any[];
  systemSettings: SystemCustomSettings;
  onSaveSystemSettings: (nextSettings: SystemCustomSettings) => void;
  onPurgeAdvances: () => void;
  onPurgeRetirements: () => void;
}

export default function CmsPortal({
  templates,
  onSaveTemplate,
  onResetTemplates,
  sentEmails,
  onClearSentEmails,
  staffMembers,
  onUpdateStaffMembers,
  onSimulateReminders,
  onResetFactoryDefault,
  advances,
  retirements,
  systemSettings,
  onSaveSystemSettings,
  onPurgeAdvances,
  onPurgeRetirements
}: CmsPortalProps) {
  // Sub-tabs: templates, sentLog, directory, users, utilities, settings
  const [subTab, setSubTab] = useState<'templates' | 'sentLog' | 'directory' | 'users' | 'deals' | 'campaigns' | 'utilities' | 'settings'>('templates');
  
  // 1. Template States
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const [tempSubject, setTempSubject] = useState('');
  const [tempBody, setTempBody] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewDataId, setPreviewDataId] = useState<string>('');

  // 2. Directory states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [newStaffDept, setNewStaffDept] = useState('Administration');
  const [editingStaffIdx, setEditingStaffIdx] = useState<number | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [editStaffDept, setEditStaffDept] = useState('Administration');
  // Directory UI helpers: loading, errors, pagination, search, sync
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsPage, setContactsPage] = useState(0);
  const [contactsPageSize, setContactsPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSync, setLastSync] = useState<number | null>(null);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.ADMIN_OFFICER);
  const [newUserDept, setNewUserDept] = useState('IT & Systems');
  const [newUserIsActive, setNewUserIsActive] = useState(true);

  // 3. Deals state
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [newDealName, setNewDealName] = useState('');
  const [newDealValue, setNewDealValue] = useState('0');
  const [newDealStage, setNewDealStage] = useState('Prospect');
  const [editingDealIdx, setEditingDealIdx] = useState<number | null>(null);

  // 4. Campaigns state
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignStatus, setNewCampaignStatus] = useState('Draft');
  const [editingCampaignIdx, setEditingCampaignIdx] = useState<number | null>(null);

  // 5. System settings CMS states
  const [cmsLogoText, setCmsLogoText] = useState(systemSettings.customLogoText);
  const [cmsMaxAdvance, setCmsMaxAdvance] = useState(systemSettings.maxCashAdvance);
  const [cmsRetireDays, setCmsRetireDays] = useState(systemSettings.retirementWindowDays);
  const [cmsExecThreshold, setCmsExecThreshold] = useState(systemSettings.requiresExecutiveApprovalAbove);
  const [cmsAccent, setCmsAccent] = useState(systemSettings.themeAccent);
  const [cmsBorder, setCmsBorder] = useState(systemSettings.borderStyle);
  const [cmsSupportEmail, setCmsSupportEmail] = useState(systemSettings.supportEmail);
  const [cmsSupportPhone, setCmsSupportPhone] = useState(systemSettings.supportPhone);
  const [cmsDebugEnabled, setCmsDebugEnabled] = useState(systemSettings.debugBarEnabled);
  const [cmsLogoUrl, setCmsLogoUrl] = useState(systemSettings.customLogoUrl || '');
  const [cmsBackgroundUrl, setCmsBackgroundUrl] = useState(systemSettings.customBackgroundUrl || '');
  const [cmsFrameColor, setCmsFrameColor] = useState(systemSettings.customFrameColor || '#ffffff');
  const [cmsTableColor, setCmsTableColor] = useState(systemSettings.customTableColor || '#cbd5e1');
  const [cmsIconColor, setCmsIconColor] = useState(systemSettings.customIconColor || '#6366f1');
  const [cmsButtonBg, setCmsButtonBg] = useState(systemSettings.customButtonBg || '#977A4A');
  const [cmsButtonText, setCmsButtonText] = useState(systemSettings.customButtonText || '#ffffff');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState('');
  const [backgroundUploadStatus, setBackgroundUploadStatus] = useState('');
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [backgroundUploadLoading, setBackgroundUploadLoading] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<'branding' | 'colors' | 'fiscal' | 'support'>('branding');

  useEffect(() => {
    setCmsLogoText(systemSettings.customLogoText);
    setCmsMaxAdvance(systemSettings.maxCashAdvance);
    setCmsRetireDays(systemSettings.retirementWindowDays);
    setCmsExecThreshold(systemSettings.requiresExecutiveApprovalAbove);
    setCmsAccent(systemSettings.themeAccent);
    setCmsBorder(systemSettings.borderStyle);
    setCmsSupportEmail(systemSettings.supportEmail);
    setCmsSupportPhone(systemSettings.supportPhone);
    setCmsDebugEnabled(systemSettings.debugBarEnabled);
    setCmsLogoUrl(systemSettings.customLogoUrl || '');
    setCmsBackgroundUrl(systemSettings.customBackgroundUrl || '');
    setCmsFrameColor(systemSettings.customFrameColor || '#ffffff');
    setCmsTableColor(systemSettings.customTableColor || '#cbd5e1');
    setCmsIconColor(systemSettings.customIconColor || '#6366f1');
    setCmsButtonBg(systemSettings.customButtonBg || '#977A4A');
    setCmsButtonText(systemSettings.customButtonText || '#ffffff');
  }, [systemSettings]);

  // Trigger preview compile when template selection changes
  useEffect(() => {
    if (selectedTemplate) {
      setTempSubject(selectedTemplate.subject);
      setTempBody(selectedTemplate.body);
    }
  }, [selectedTemplateId, templates]);

  // Dynamic compiler function for visual email previews
  const compileTemplateHTML = (html: string, recordId: string) => {
    // Pick an active record or fallback mock
    let refNum = "CA-2026-003";
    let staff = "Ovat Daniel";
    let dept = "Administration";
    let purpose = "Procurement of office stationery and printing materials";
    let amtReq = "450";
    let expireDate = "2026-06-25";
    let method = "Bank Transfer";
    let paymentRef = "TXN-902183712";
    let amtPaid = "450";
    let remark = "Urgent plumbing repairs approved and closed.";
    let retId = "RET-2026-001";
    let advAmt = "800";
    let utilAmt = "780";
    let refBal = "20";
    let evUser = "Marcus Vance";
    let evRole = "Internal Control Officer";
    let evAction = "Approved and Cleared";
    let stateVal = "Awaiting Finance Payment";

    // Try to load actual state values
    if (advances && advances.length > 0) {
      const liveAdv = advances.find(a => a.id === recordId) || advances[0];
      if (liveAdv) {
        refNum = liveAdv.referenceNumber;
        staff = liveAdv.staffName;
        dept = liveAdv.department;
        purpose = liveAdv.purpose;
        amtReq = String(liveAdv.amountRequested);
        expireDate = liveAdv.expectedRetirementDate;
        stateVal = liveAdv.currentStatus;
        
        if (liveAdv.paymentDetails) {
          method = liveAdv.paymentDetails.paymentMethod;
          paymentRef = liveAdv.paymentDetails.paymentReference;
          amtPaid = String(liveAdv.paymentDetails.amountPaid);
        }
      }
    }

    if (retirements && retirements.length > 0) {
      const liveRet = retirements[0];
      if (liveRet) {
        retId = liveRet.id.replace('RET-', '');
        advAmt = String(liveRet.amountAdvanced);
        utilAmt = String(liveRet.amountUtilized);
        refBal = String(liveRet.balanceReturned);
        remark = liveRet.comment || "";
      }
    }

    let compiled = html;
    compiled = compiled.replace(/\{\{referenceNumber\}\}/g, refNum);
    compiled = compiled.replace(/\{\{staffName\}\}/g, staff);
    compiled = compiled.replace(/\{\{department\}\}/g, dept);
    compiled = compiled.replace(/\{\{purpose\}\}/g, purpose);
    compiled = compiled.replace(/\{\{amountRequested\}\}/g, amtReq);
    compiled = compiled.replace(/\{\{expectedRetirementDate\}\}/g, expireDate);
    compiled = compiled.replace(/\{\{paymentMethod\}\}/g, method);
    compiled = compiled.replace(/\{\{paymentReference\}\}/g, paymentRef);
    compiled = compiled.replace(/\{\{amountPaid\}\}/g, amtPaid);
    compiled = compiled.replace(/\{\{appUrl\}\}/g, window.location.origin);
    compiled = compiled.replace(/\{\{actionUser\}\}/g, evUser);
    compiled = compiled.replace(/\{\{actionRole\}\}/g, evRole);
    compiled = compiled.replace(/\{\{actionName\}\}/g, evAction);
    compiled = compiled.replace(/\{\{comment\}\}/g, remark);
    compiled = compiled.replace(/\{\{status\}\}/g, stateVal);
    compiled = compiled.replace(/\{\{retirementId\}\}/g, retId);
    compiled = compiled.replace(/\{\{amountAdvanced\}\}/g, advAmt);
    compiled = compiled.replace(/\{\{amountUtilized\}\}/g, utilAmt);
    compiled = compiled.replace(/\{\{balanceReturned\}\}/g, refBal);

    return compiled;
  };

  const handleSave = () => {
    if (!tempSubject.trim() || !tempBody.trim()) {
      alert("Error: Subject and Body template content cannot be empty.");
      return;
    }
    const updated: EmailTemplate = {
      ...selectedTemplate,
      subject: tempSubject,
      body: tempBody
    };
    onSaveTemplate(updated);
    alert(`Success: Customizable template "${selectedTemplate.name}" has been updated inside corporate cache ledger!`);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      alert("Please enter a valid staff name.");
      return;
    }
    // Check duplicates
    if (staffMembers.some(s => s.name.toLowerCase() === newStaffName.toLowerCase().trim())) {
      alert("Error: Employee name already exists in the corporate staff register.");
      return;
    }
    const addedMember = {
      name: newStaffName.trim(),
      role: newStaffRole,
      department: newStaffDept
    };
    // Try to persist to backend CMS, fall back to local update
    (async () => {
      try {
        const payload = { name: addedMember.name, department: addedMember.department, role: String(addedMember.role) };
        const created = await cmsClient.createContact(payload as any);
        // map created contact to staff member representation
        const next = [...staffMembers, { name: created.name || addedMember.name, role: addedMember.role, department: created.department || addedMember.department }];
        onUpdateStaffMembers(next);
        setNewStaffName('');
        // refresh current page after successful create
        setTimeout(() => fetchPageContacts(contactsPage, contactsPageSize, searchQuery), 200);
        alert(`Personnel "${addedMember.name}" successfully incorporated into staff directory registry (synced).`);
      } catch (err) {
        // fallback local
        onUpdateStaffMembers([...staffMembers, addedMember]);
        setNewStaffName('');
        alert(`Personnel "${addedMember.name}" added locally (backend unavailable).`);
      }
    })();
  };

  const fetchPageContacts = async (page: number, pageSize: number, q: string) => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const offset = page * pageSize;
      const contacts: any[] = await cmsClient.getContacts(pageSize, offset);
      // If backend returned an array, map and update staffMembers
      if (Array.isArray(contacts)) {
        const mapped = contacts.map((c: any) => ({ name: c.name || '', role: (c.role as UserRole) || UserRole.ADMIN_OFFICER, department: c.department || 'Administration' }));
        onUpdateStaffMembers(mapped);
      }
      setLastSync(Date.now());
    } catch (e: any) {
      setContactsError(String(e?.message || e));
    } finally {
      setContactsLoading(false);
    }
  };

  const fetchDeals = async (pageSize = 50, offset = 0) => {
    setDealsLoading(true);
    setDealsError(null);
    try {
      const dealsList: any[] = await cmsClient.getDeals(pageSize, offset);
      if (Array.isArray(dealsList)) {
        setDeals(dealsList);
      }
    } catch (e: any) {
      setDealsError(String(e?.message || e));
    } finally {
      setDealsLoading(false);
    }
  };

  const fetchCampaigns = async (pageSize = 50, offset = 0) => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const campaignsList: any[] = await cmsClient.getCampaigns(pageSize, offset);
      if (Array.isArray(campaignsList)) {
        setCampaigns(campaignsList);
      }
    } catch (e: any) {
      setCampaignsError(String(e?.message || e));
    } finally {
      setCampaignsLoading(false);
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealName.trim()) {
      alert("Please enter a valid deal name.");
      return;
    }
    try {
      const payload = { name: newDealName.trim(), value: Number(newDealValue) || 0, stage: newDealStage };
      const created = await cmsClient.createDeal(payload);
      setDeals([...deals, created]);
      setNewDealName('');
      setNewDealValue('0');
      alert(`Deal "${newDealName}" created successfully.`);
      fetchDeals();
    } catch (err) {
      alert(`Error creating deal: ${err}`);
    }
  };

  const handleDeleteDeal = async (index: number) => {
    const deal = deals[index];
    if (confirm(`Delete deal "${deal.name}"?`)) {
      try {
        await cmsClient.deleteDeal(deal.id);
        setDeals(deals.filter((_, i) => i !== index));
        alert("Deal deleted successfully.");
        fetchDeals();
      } catch (err) {
        alert(`Error deleting deal: ${err}`);
      }
    }
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      alert("Please enter a valid campaign name.");
      return;
    }
    try {
      const payload = { name: newCampaignName.trim(), subject: newCampaignSubject, status: newCampaignStatus };
      const created = await cmsClient.createCampaign(payload);
      setCampaigns([...campaigns, created]);
      setNewCampaignName('');
      setNewCampaignSubject('');
      alert(`Campaign "${newCampaignName}" created successfully.`);
      fetchCampaigns();
    } catch (err) {
      alert(`Error creating campaign: ${err}`);
    }
  };

  const handleDeleteCampaign = async (index: number) => {
    const campaign = campaigns[index];
    if (confirm(`Delete campaign "${campaign.name}"?`)) {
      try {
        await cmsClient.deleteCampaign(campaign.id);
        setCampaigns(campaigns.filter((_, i) => i !== index));
        alert("Campaign deleted successfully.");
        fetchCampaigns();
      } catch (err) {
        alert(`Error deleting campaign: ${err}`);
      }
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const userList = await authClient.getUsers();
      setUsers(userList);
    } catch (err: any) {
      setUsersError(String(err?.message || err));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail.trim() || !newUserFirstName.trim() || !newUserLastName.trim() || !newUserPassword || !newUserConfirmPassword) {
      alert('Please complete all required fields.');
      return;
    }

    if (newUserPassword !== newUserConfirmPassword) {
      alert('Passwords do not match. Please confirm the new password.');
      return;
    }

    try {
      await authClient.createUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        firstName: newUserFirstName.trim(),
        lastName: newUserLastName.trim(),
        department: newUserDept,
        role: newUserRole,
        isActive: newUserIsActive
      });

      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserConfirmPassword('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserRole(UserRole.ADMIN_OFFICER);
      setNewUserDept('IT & Systems');
      setNewUserIsActive(true);

      alert('User account created successfully.');
      fetchUsers();
    } catch (err: any) {
      alert(`Error creating user account: ${err?.message || err}`);
    }
  };

  const handleToggleUserActive = async (user: AuthUser) => {
    const confirmAction = confirm(
      `Are you sure you want to ${user.is_active ? 'disable' : 'enable'} the account for ${user.email}?`
    );
    if (!confirmAction) {
      return;
    }

    try {
      await authClient.updateUser(user.id, { isActive: !user.is_active });
      fetchUsers();
      alert(`User account ${user.is_active ? 'disabled' : 'enabled'} successfully.`);
    } catch (err: any) {
      alert(`Error updating user status: ${err?.message || err}`);
    }
  };

  const handleResetUserPassword = async (user: AuthUser) => {
    const newPassword = prompt(`Enter a new password for ${user.email}:`, '');
    if (!newPassword) {
      return;
    }

    try {
      await authClient.updateUser(user.id, { resetPassword: newPassword });
      alert('Password reset successfully.');
    } catch (err: any) {
      alert(`Error resetting password: ${err?.message || err}`);
    }
  };

  const handleClearUserProfile = async (user: AuthUser) => {
    if (!confirm(`Clear profile data for ${user.email}? This will remove name, department, and profile photo links.`)) {
      return;
    }

    try {
      await authClient.clearUserProfile(user.id);
      fetchUsers();
      alert('User profile data cleared successfully.');
    } catch (err: any) {
      alert(`Error clearing profile data: ${err?.message || err}`);
    }
  };

  const handleDeleteUser = async (user: AuthUser) => {
    if (!confirm(`Permanently delete user account ${user.email}? This cannot be undone.`)) {
      return;
    }

    try {
      await authClient.deleteUser(user.id);
      setUsers((current) => current.filter((u) => u.id !== user.id));
      alert('User account deleted successfully.');
    } catch (err: any) {
      alert(`Error deleting user account: ${err?.message || err}`);
    }
  };

  const handleEditStaff = (index: number) => {
    const s = staffMembers[index];
    setEditingStaffIdx(index);
    setEditStaffName(s.name);
    setEditStaffRole(s.role);
    setEditStaffDept(s.department);
  };

  const handleSaveEditStaff = () => {
    if (!editStaffName.trim()) {
      alert("Employee name cannot be empty.");
      return;
    }
    const nextList = [...staffMembers];
    nextList[editingStaffIdx!] = {
      name: editStaffName.trim(),
      role: editStaffRole,
      department: editStaffDept
    };
    onUpdateStaffMembers(nextList);
    setEditingStaffIdx(null);
    alert("Employee record updated successfully in control data!");
  };

  const handleDeleteStaff = (index: number) => {
    if (staffMembers.length <= 1) {
      alert("Error: Directory requires at least 1 employee to function.");
      return;
    }
    const person = staffMembers[index];
    if (confirm(`Remove "${person.name}" from active staff registers? Dynamic login simulations will clear.`)) {
      (async () => {
        try {
          // attempt to find contact by name via CMS search and delete first match
          const contacts = await cmsClient.getContacts(50, 0);
          const match = contacts.find((c: any) => String(c.name).toLowerCase() === String(person.name).toLowerCase());
          if (match && match.id) {
            await cmsClient.deleteContact(match.id);
            // refresh current page after removal
            setTimeout(() => fetchPageContacts(contactsPage, contactsPageSize, searchQuery), 200);
          }
        } catch (e) {
          // ignore errors and continue with local removal
        }
        const nextList = staffMembers.filter((_, idx) => idx !== index);
        onUpdateStaffMembers(nextList);
        alert("Personnel permanently detached from active organizational directories.");
      })();
    }
  };

  const handleLogoFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoUploadStatus('Only image files are supported for brand logos.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadStatus('Logo file must be smaller than 5MB.');
      return;
    }
    setLogoFile(file);
    setLogoUploadStatus('Ready to upload logo.');
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      setLogoUploadStatus('Choose a logo file first.');
      return;
    }
    setLogoUploadLoading(true);
    setLogoUploadStatus('Uploading logo...');
    try {
      const uploaded = await cmsClient.uploadMedia(logoFile);
      setCmsLogoUrl(uploaded.fileUrl);
      setLogoFile(null);
      setLogoUploadStatus('Logo uploaded successfully. Save settings to apply permanently.');
    } catch (err: any) {
      setLogoUploadStatus(`Upload failed: ${err?.message || err}`);
    } finally {
      setLogoUploadLoading(false);
    }
  };

  const handleBackgroundFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBackgroundUploadStatus('Only image files are supported for portal background images.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBackgroundUploadStatus('Background image must be smaller than 10MB.');
      return;
    }
    setBackgroundFile(file);
    setBackgroundUploadStatus('Ready to upload portal background.');
  };

  const handleUploadBackground = async () => {
    if (!backgroundFile) {
      setBackgroundUploadStatus('Choose a background file first.');
      return;
    }
    setBackgroundUploadLoading(true);
    setBackgroundUploadStatus('Uploading background image...');
    try {
      const uploaded = await cmsClient.uploadMedia(backgroundFile);
      setCmsBackgroundUrl(uploaded.fileUrl);
      setBackgroundFile(null);
      setBackgroundUploadStatus('Background uploaded successfully. Save settings to apply permanently.');
    } catch (err: any) {
      setBackgroundUploadStatus(`Upload failed: ${err?.message || err}`);
    } finally {
      setBackgroundUploadLoading(false);
    }
  };

  // Load CMS contacts when directory tab is active
  useEffect(() => {
    if (subTab !== 'directory') return;
    // Load the current page with optional search
    fetchPageContacts(contactsPage, contactsPageSize, searchQuery);
  }, [subTab]);

  // refetch when page, pageSize or query changes while directory is active
  useEffect(() => {
    if (subTab !== 'directory') return;
    fetchPageContacts(contactsPage, contactsPageSize, searchQuery);
  }, [contactsPage, contactsPageSize, searchQuery]);

  // Load CMS deals when deals tab is active
  useEffect(() => {
    if (subTab !== 'deals') return;
    fetchDeals();
  }, [subTab]);

  // Load CMS campaigns when campaigns tab is active
  useEffect(() => {
    if (subTab !== 'campaigns') return;
    fetchCampaigns();
  }, [subTab]);

  // Load admin users when users tab is active
  useEffect(() => {
    if (subTab !== 'users') return;
    fetchUsers();
  }, [subTab]);

  // View modal helper for looking at html outbox logs
  const [viewingEmailBody, setViewingEmailBody] = useState<string | null>(null);
  const [viewingEmailSubject, setViewingEmailSubject] = useState<string | null>(null);

  return (
    <div id="cms-portal-workspace" className="max-w-7xl mx-auto space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Visual Workspace Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md shadow-indigo-900/10">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-5.5 h-5.5 text-blue-400" /> CMS & Systems Control Portal
          </h2>
          <p className="text-xs text-slate-400">
            Configure dynamic notifications, modify corporate directory personnel, audit sent outbox mails, and execute scheduler utilities.
          </p>
        </div>

      </div>

      {/* CMS Workspace Sidebar & Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Navigation Sidebar - Non-scattered, spacious */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block px-2.5">System Modules</span>
          </div>

          <div className="space-y-1">
            <button
              id="subtab-templates"
              onClick={() => setSubTab('templates')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none ${
                subTab === 'templates' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold animate-pulse-subtle' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <FileCode className="w-4 h-4 shrink-0" />
              <span>Email Templates</span>
            </button>

            <button
              id="subtab-sent-log"
              onClick={() => setSubTab('sentLog')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${
                subTab === 'sentLog' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Sent Outbox</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                subTab === 'sentLog' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{sentEmails.length}</span>
            </button>

            <button
              id="subtab-directory"
              onClick={() => setSubTab('directory')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${
                subTab === 'directory' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>Corporate Staff</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                subTab === 'directory' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{staffMembers.length}</span>
            </button>

            <button
              id="subtab-users"
              onClick={() => setSubTab('users')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none ${
                subTab === 'users' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>User Accounts</span>
            </button>

            <button
              id="subtab-deals"
              onClick={() => setSubTab('deals')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${
                subTab === 'deals' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ChevronRight className="w-4 h-4 shrink-0" />
                <span>Sales Deals</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                subTab === 'deals' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{deals.length}</span>
            </button>

            <button
              id="subtab-campaigns"
              onClick={() => setSubTab('campaigns')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${
                subTab === 'campaigns' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 shrink-0" />
                <span>Campaigns</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold font-mono ${
                subTab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>{campaigns.length}</span>
            </button>

            <button
              id="subtab-utilities"
              onClick={() => setSubTab('utilities')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none ${
                subTab === 'utilities' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>System Scheduler</span>
            </button>

            <button
              id="subtab-settings"
              onClick={() => setSubTab('settings')}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 text-xs font-semibold select-none ${
                subTab === 'settings' 
                  ? 'bg-blue-600 text-white shadow-sm font-bold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>IT CMS Settings</span>
            </button>
          </div>
        </div>

        {/* Right Panel Workspace Content */}
        <div className="lg:col-span-9 space-y-6">
          {/* SUB-TAB 1: EMAIL TEMPLATES BUILD SYSTEM */}
          {subTab === 'templates' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Column A: Left side template selector links */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Customizable Mail Flow</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {templates.map(t => {
                    const isActive = t.id === selectedTemplateId;
                    return (
                      <button
                        id={`select-template-btn-${t.id}`}
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${isActive ? 'bg-blue-50/50 border-r-4 border-blue-500 font-medium' : ''}`}
                      >
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.bannerColor }}></div>
                        <div className="min-w-0">
                          <span className={`text-xs font-bold block ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>{t.name}</span>
                          <p className="text-[11px] text-slate-400 mt-1 lines-clamp-2 leading-normal">{t.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-4 bg-slate-50/80 border-t border-slate-200 text-center">
                  <button
                    id="reset-templates-factory-btn"
                    onClick={() => {
                      if (confirm("Reset editing templates to pristine default system states? All customized markup changes will refresh.")) {
                        onResetTemplates();
                        alert("Custom layouts restored successfully.");
                      }
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center justify-center gap-1 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Revert all Templates
                  </button>
                </div>
              </div>

              {/* Column B: Right side editable workspace and visual sandboxed representation */}
              <div className="lg:col-span-2 space-y-6">
            
            {/* The Code Editor Panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-start gap-4 pb-3 border-b border-slate-150">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Editing Layout Code: {selectedTemplate.name}</h3>
                  <p className="text-[11px] text-slate-400">Update subject variables and HTML layout lines dynamically.</p>
                </div>

                <button
                  id="save-template-detail-btn"
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-100"
                >
                  <Save className="w-4 h-4" /> Save Template
                </button>
              </div>

              {/* Subject config */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dynamic Email Subject Line</label>
                <input
                  id="template-subject-input"
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-bold outline-none focus:border-blue-500 font-sans text-slate-800"
                  value={tempSubject}
                  onChange={(e) => setTempSubject(e.target.value)}
                />
              </div>

              {/* Available placeholders list */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Supported Interpolation Variables</span>
                <div className="flex flex-wrap gap-1.5">
                  {['referenceNumber', 'staffName', 'department', 'purpose', 'amountRequested', 'expectedRetirementDate', 'actionUser', 'actionRole', 'actionName', 'comment', 'paymentMethod', 'paymentReference', 'amountPaid', 'status', 'retirementId', 'amountAdvanced', 'amountUtilized', 'balanceReturned', 'appUrl'].map(v => (
                    <button
                      key={v}
                      onClick={() => {
                        // Insert at current cursor position or wrap in copy notification
                        navigator.clipboard.writeText(`{{${v}}}`);
                        alert(`Copied interpolation variable to clipboard: {{${v}}}`);
                      }}
                      className="text-[10px] font-mono bg-white hover:bg-blue-50 text-slate-650 hover:text-blue-700 border border-slate-200 hover:border-blue-200 py-0.5 px-1.5 rounded transition-all cursor-pointer font-medium"
                      title="Click to copy placeholder"
                    >
                      {"{{" + v + "}}"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Markup Area */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <FileCode className="w-4 h-4 text-slate-400" /> Responsive Layout HTML Source
                </label>
                <textarea
                  id="template-body-textarea"
                  rows={13}
                  className="w-full bg-slate-900 border border-slate-950 p-4 rounded-xl text-[11px] font-mono text-emerald-400 outline-none leading-relaxed"
                  value={tempBody}
                  onChange={(e) => setTempBody(e.target.value)}
                />
              </div>
            </div>

            {/* Visual Live Sandbox representation (Previewer!) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Dynamic IFrame Mail Sandbox representation</h4>
                  <p className="text-[11px] text-slate-400">See exact visual compiler render substituting real test variables.</p>
                </div>

                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-[10px] font-bold">
                  <button
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1 px-2 rounded-md ${previewDevice === 'desktop' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Laptop className="w-3.5 h-3.5 inline mr-1" /> Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 px-2 rounded-md ${previewDevice === 'mobile' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Smartphone className="w-3.5 h-3.5 inline mr-1" /> Mobile
                  </button>
                </div>
              </div>

              {/* Dynamic selector to pick an existing Cash Advance and preview with its real data */}
              <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex items-center gap-3 text-xs">
                <span className="text-slate-400 font-medium">Render with values from request:</span>
                <select
                  id="preview-data-selector"
                  className="bg-white border border-slate-200 p-1.5 rounded outline-none font-bold text-slate-700 text-xs"
                  value={previewDataId}
                  onChange={(e) => setPreviewDataId(e.target.value)}
                >
                  <option value="">-- Choose Test Advance folder --</option>
                  {advances.map(a => (
                    <option key={a.id} value={a.id}>{a.referenceNumber} ({a.staffName.slice(0, 15)})</option>
                  ))}
                </select>
              </div>

              {/* The Preview container */}
              <div className="p-6 bg-slate-100 flex justify-center items-center">
                <div 
                  className={`bg-white border border-slate-200 shadow-lg rounded-xl overflow-y-auto transition-all duration-350 ${
                    previewDevice === 'desktop' ? 'w-full h-[450px]' : 'w-[400px] h-[550px]'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  <div className="bg-slate-50 border-b border-slate-150 px-4 py-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Subject: {compileTemplateHTML(tempSubject, previewDataId)}</span>
                    <span className="uppercase text-[8px] bg-slate-200 text-slate-500 rounded px-1.5 font-bold">Mailbox Sandbox</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: compileTemplateHTML(tempBody, previewDataId) }} />
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUB-TAB 2: SENT OUTBOX MAIL LOGS */}
      {subTab === 'sentLog' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Corporate Outbox Auditing Logs</h3>
              <p className="text-[11px] text-slate-400">Total email dispatches securely logged: <strong>{sentEmails.length}</strong>. Click any item to inspect actual sent copy.</p>
            </div>

            {sentEmails.length > 0 && (
              <button
                id="clear-sent-outbox-btn"
                onClick={() => {
                  if (confirm("Permanently clear sent notifications log history? This action is immutable.")) {
                    onClearSentEmails();
                  }
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-3 py-1.5 rounded hover:bg-rose-50 transition-colors border border-rose-100 bg-white"
              >
                <Trash2 className="w-3.5 h-3.5" /> Wipe Outbox Logs
              </button>
            )}
          </div>

          {sentEmails.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-xs">
              No emails have been dispatched during this active session. Play inside approvals or trigger reminders to populated.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs font-sans">
              <table className="min-w-full text-left divide-y divide-slate-100">
                <thead className="bg-slate-50 font-bold uppercase text-slate-450 tracking-wider">
                  <tr>
                    <th className="p-3">Reference No</th>
                    <th className="p-3">Dispatched Date</th>
                    <th className="p-3">Recipient Name (Role)</th>
                    <th className="p-3">Recipient Email</th>
                    <th className="p-3">Subject Line</th>
                    <th className="p-3 text-center">Receipt Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sentEmails.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{item.referenceNumber || "SYSTEM"}</td>
                      <td className="p-3 font-mono text-slate-400">{item.date}</td>
                      <td className="p-3">
                        <strong className="text-slate-800">{item.recipientName}</strong>
                        <span className="block text-[9px] text-slate-400 font-mono italic leading-none mt-1">{item.recipientRole}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-550">{item.recipientEmail}</td>
                      <td className="p-3 font-medium text-slate-700 truncate max-w-xs">{item.subject}</td>
                      <td className="p-3 text-center">
                        <button
                          id={`review-sent-email-${item.id}`}
                          onClick={() => {
                            setViewingEmailBody(item.body);
                            setViewingEmailSubject(item.subject);
                          }}
                          className="bg-slate-50 border border-slate-205 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-slate-650 transition-all rounded py-1 px-2.5 font-bold flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> Review Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* SUB-TAB 3: CORPORATE IDENTITY DIRECTORY (STAFF Directory CMS) */}
      {subTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel creators */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <UserPlus className="w-4 h-4 text-blue-600" /> Add Corporate Employee Record
            </h3>
            
            <form onSubmit={handleAddStaff} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Officer Name *</label>
                <input
                  id="new-staff-name-input"
                  type="text"
                  placeholder="e.g. Douglas Miller"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Corporate Role Authority *</label>
                <select
                  id="new-staff-role-select"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                  <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                  <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                  <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                  <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                  <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assigned Department *</label>
                <select
                  id="new-staff-dept-select"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <button
                id="add-directory-staff-btn"
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                Assemble New Officer Profile
              </button>
            </form>
          </div>

          {/* Right panel: Active directory listings */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" /> Authorized Personnel Directory
              </h3>
              <span className="text-[10px] bg-slate-100 font-semibold px-2.5 py-0.5 rounded font-mono text-slate-500">
                ACTIVE COUNT: {staffMembers.length}
              </span>
            </div>

            {/* Directory controls: search, page size, pagination, sync status */}
            <div className="flex items-center justify-between gap-3 pb-3">
              <div className="flex items-center gap-2 w-full">
                <input
                  id="directory-search-input"
                  placeholder="Search staff by name or department..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setContactsPage(0); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                />
                <select
                  id="directory-page-size"
                  value={contactsPageSize}
                  onChange={(e) => { setContactsPageSize(Number(e.target.value)); setContactsPage(0); }}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 mr-2">{contactsLoading ? 'Syncing…' : (lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString()}` : 'Never synced')}</div>
                {contactsError && (
                  <div className="text-[11px] text-rose-600 font-semibold">Error: {contactsError}</div>
                )}
                <button
                  id="directory-prev-page"
                  onClick={() => setContactsPage(p => Math.max(0, p - 1))}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                >Prev</button>
                <div className="text-xs font-mono px-2">Page {contactsPage + 1}</div>
                <button
                  id="directory-next-page"
                  onClick={() => setContactsPage(p => p + 1)}
                  className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                >Next</button>
              </div>
            </div>

            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {staffMembers.map((item, index) => {
                const cleanEmail = item.name.toLowerCase().replace(/\s+/g, '.') + "@corporate.com";
                const isEditing = editingStaffIdx === index;
                return (
                  <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    {isEditing ? (
                      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <input
                          id={`edit-staff-name-input-${index}`}
                          type="text"
                          className="bg-white border rounded p-1.5 font-bold"
                          value={editStaffName}
                          onChange={(e) => setEditStaffName(e.target.value)}
                        />
                        <select
                          id={`edit-staff-role-select-${index}`}
                          className="bg-white border rounded p-1 text-[11px]"
                          value={editStaffRole}
                          onChange={(e) => setEditStaffRole(e.target.value as UserRole)}
                        >
                          <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                          <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                          <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                          <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                          <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                          <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                        </select>
                        <select
                          id={`edit-staff-dept-select-${index}`}
                          className="bg-white border rounded p-1 text-[11px]"
                          value={editStaffDept}
                          onChange={(e) => setEditStaffDept(e.target.value)}
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        <div className="col-span-1 sm:col-span-3 flex justify-end gap-1 pt-1">
                          <button
                            onClick={() => setEditingStaffIdx(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEditStaff}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-bold"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            {item.name}
                            {item.role === UserRole.SYSTEM_ADMIN && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-700 rounded-md font-mono py-0.5 px-1 font-extrabold uppercase">Sysop</span>
                            )}
                          </h4>
                          <span className="block mt-1 text-[10px] text-slate-500 font-mono tracking-tight font-semibold uppercase">{item.role}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{item.department} • {cleanEmail}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                          <button
                            id={`edit-directory-staff-${index}`}
                            onClick={() => handleEditStaff(index)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-white border border-slate-200 rounded px-2.5 py-1 bg-white hover:border-blue-300 shadow-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-directory-staff-${index}`}
                            onClick={() => handleDeleteStaff(index)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-slate-200 rounded px-1.5 py-1 bg-white transition-colors cursor-pointer"
                            title="Delete employee profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {subTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> Create New System User
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address *</label>
                <input
                  id="new-user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">First Name *</label>
                  <input
                    id="new-user-firstname"
                    type="text"
                    placeholder="First name"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Last Name *</label>
                  <input
                    id="new-user-lastname"
                    type="text"
                    placeholder="Last name"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password *</label>
                <input
                  id="new-user-password"
                  type="password"
                  placeholder="Strong password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm Password *</label>
                <input
                  id="new-user-confirm-password"
                  type="password"
                  placeholder="Confirm password"
                  value={newUserConfirmPassword}
                  onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">User Role *</label>
                <select
                  id="new-user-role"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                >
                  <option value={UserRole.ADMIN_OFFICER}>{UserRole.ADMIN_OFFICER}</option>
                  <option value={UserRole.HEAD_OF_ADMIN}>{UserRole.HEAD_OF_ADMIN}</option>
                  <option value={UserRole.INTERNAL_CONTROL}>{UserRole.INTERNAL_CONTROL}</option>
                  <option value={UserRole.EXECUTIVE_DIRECTOR}>{UserRole.EXECUTIVE_DIRECTOR}</option>
                  <option value={UserRole.FINANCE_OFFICER}>{UserRole.FINANCE_OFFICER}</option>
                  <option value={UserRole.SYSTEM_ADMIN}>{UserRole.SYSTEM_ADMIN}</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                <select
                  id="new-user-department"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-semibold outline-none focus:border-blue-500"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  id="new-user-active"
                  type="checkbox"
                  checked={newUserIsActive}
                  onChange={(e) => setNewUserIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="new-user-active" className="font-semibold text-slate-600">Activate account immediately</label>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs transition-colors shadow-sm"
              >
                Create User Account
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Admin User Accounts</h3>
                <p className="text-[11px] text-slate-500">Manage user accounts, reset passwords, clear profile data, and enable/disable access.</p>
              </div>
              <button
                id="refresh-user-accounts-btn"
                onClick={fetchUsers}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 rounded px-2 py-1 border border-blue-100 bg-blue-50"
              >
                Refresh
              </button>
            </div>

            {usersLoading ? (
              <div className="text-xs text-slate-500">Loading users…</div>
            ) : usersError ? (
              <div className="text-xs text-rose-600">Error: {usersError}</div>
            ) : users.length === 0 ? (
              <div className="text-xs text-slate-500">No user accounts found. Create one using the form.</div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {users.map((user) => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
                        {!user.is_active && <span className="text-[9px] uppercase tracking-wider text-rose-700 bg-rose-100 rounded-full px-2 py-0.5">Disabled</span>}
                        {user.is_verified && <span className="text-[9px] uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Verified</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{user.first_name} {user.last_name} • {user.role} • {user.department || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleToggleUserActive(user)}
                        className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-3 py-2 hover:bg-slate-200"
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleResetUserPassword(user)}
                        className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2 hover:bg-blue-100"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleClearUserProfile(user)}
                        className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 hover:bg-amber-100"
                      >
                        Clear Profile
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded px-3 py-2 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SALES DEALS MANAGEMENT */}
      {subTab === 'deals' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Deal Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" /> Create New Sales Deal
              </h3>
              <form onSubmit={handleAddDeal} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deal Name *</label>
                  <input
                    id="new-deal-name"
                    type="text"
                    placeholder="e.g. Enterprise Contract"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealName}
                    onChange={(e) => setNewDealName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deal Value ($)</label>
                  <input
                    id="new-deal-value"
                    type="number"
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealValue}
                    onChange={(e) => setNewDealValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stage</label>
                  <select
                    id="new-deal-stage"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newDealStage}
                    onChange={(e) => setNewDealStage(e.target.value)}
                  >
                    <option>Prospect</option>
                    <option>Negotiation</option>
                    <option>Closed Won</option>
                    <option>Closed Lost</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs">
                  Add Deal
                </button>
              </form>
            </div>

            {/* Deals List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Active Deals ({deals.length})
              </h3>
              {dealsError && <div className="text-xs text-rose-600 mb-3">Error: {dealsError}</div>}
              {dealsLoading && <div className="text-xs text-slate-500">Loading deals...</div>}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {deals.map((deal, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-150 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{deal.name}</h4>
                      <p className="text-[10px] text-slate-500">${deal.value || 0} • {deal.stage}</p>
                    </div>
                    <button
                      id={`delete-deal-${idx}`}
                      onClick={() => handleDeleteDeal(idx)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: EMAIL CAMPAIGNS MANAGEMENT */}
      {subTab === 'campaigns' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Campaign Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> Create New Campaign
              </h3>
              <form onSubmit={handleAddCampaign} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Campaign Name *</label>
                  <input
                    id="new-campaign-name"
                    type="text"
                    placeholder="e.g. Spring Promotion"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Subject</label>
                  <input
                    id="new-campaign-subject"
                    type="text"
                    placeholder="e.g. Exclusive Offer Inside"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignSubject}
                    onChange={(e) => setNewCampaignSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                  <select
                    id="new-campaign-status"
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs outline-none focus:border-blue-500"
                    value={newCampaignStatus}
                    onChange={(e) => setNewCampaignStatus(e.target.value)}
                  >
                    <option>Draft</option>
                    <option>Scheduled</option>
                    <option>Sent</option>
                    <option>Archived</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs">
                  Create Campaign
                </button>
              </form>
            </div>

            {/* Campaigns List */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" /> Active Campaigns ({campaigns.length})
              </h3>
              {campaignsError && <div className="text-xs text-rose-600 mb-3">Error: {campaignsError}</div>}
              {campaignsLoading && <div className="text-xs text-slate-500">Loading campaigns...</div>}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {campaigns.map((campaign, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded border border-slate-150 flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{campaign.name}</h4>
                      <p className="text-[10px] text-slate-500">{campaign.subject || 'No subject'} • {campaign.status}</p>
                    </div>
                    <button
                      id={`delete-campaign-${idx}`}
                      onClick={() => handleDeleteCampaign(idx)}
                      className="text-rose-600 hover:text-rose-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SYSTEM UTILITIES & SCHEDULER */}
      {subTab === 'utilities' && (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 text-center">
          <ShieldAlert className="w-12 h-12 text-blue-600 mx-auto animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">Operational Scheduler Utilities</h3>
            <p className="text-xs text-slate-500 mt-1">Simulate timing reminders, dispatch overdue notifications, or clear data caches.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-left space-y-3 font-sans">
            <h4 className="text-xs font-bold text-slate-750 uppercase tracking-widest flex items-center gap-1 border-b border-slate-200 pb-2">
              <Clock className="w-4 h-4 text-amber-500" /> Payment Timing simulation triggers
            </h4>
            
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              The specifications dictate system notifications automatically trigger to prompt payout action on lingering files:
            </p>
            <ul className="text-[11px] list-disc pl-4 text-slate-500 space-y-1">
              <li><strong>Pending for &gt;2 Days:</strong> Push alert notify to Finance Officer: <em>"Payment request {`{Ref}`} has been awaiting processing..."</em></li>
              <li><strong>Overdue &gt;5 Days:</strong> Escalate alerts directly to Line Manager and Executive Director.</li>
            </ul>

            <div className="pt-2 grid grid-cols-2 gap-2 text-center">
              <button
                id="trigger-schedule-2-days"
                onClick={() => onSimulateReminders(2)}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                🚀 Trigger &gt;2-Day Reminders
              </button>

              <button
                id="trigger-schedule-5-days"
                onClick={() => onSimulateReminders(5)}
                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all border border-rose-100 flex items-center justify-center gap-1 cursor-pointer"
              >
                🚨 Trigger &gt;5-Day Escalations
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-150">
            <button
              id="system-factory-reset-btn"
              onClick={onResetFactoryDefault}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Wipe cache & Hard Reset Database
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 7: IT DEPT GLOBAL CMS & THEMES SETTINGS */}
      {subTab === 'settings' && (
        <div className="space-y-6 animate-fade-in text-left">
          
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md shadow-indigo-900/15">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5.5 h-5.5 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono select-none">Secure IT Admin Access Active</span>
              </div>
              <h3 className="text-base font-bold text-slate-100 mt-1 font-sans">IT & System Control Center</h3>
              <p className="text-xs text-slate-400">Configure real-time server policy definitions, dynamic theme sets, custom header title and database locks.</p>
            </div>
            
            <button
              type="button"
              id="cms-save-settings-btn-main"
              onClick={() => {
                onSaveSystemSettings({
                  maxCashAdvance: Number(cmsMaxAdvance) || 2000000,
                  retirementWindowDays: Number(cmsRetireDays) || 14,
                  requiresExecutiveApprovalAbove: Number(cmsExecThreshold) || 1000000,
                  customLogoText: cmsLogoText,
                  customLogoUrl: cmsLogoUrl,
                  customBackgroundUrl: cmsBackgroundUrl,
                    customFrameColor: cmsFrameColor,
                    customTableColor: cmsTableColor,
                    customButtonBg: cmsButtonBg,
                    customButtonText: cmsButtonText,
                  themeAccent: cmsAccent,
                  borderStyle: cmsBorder,
                  supportEmail: cmsSupportEmail,
                  supportPhone: cmsSupportPhone,
                  debugBarEnabled: cmsDebugEnabled
                });
                setSaveSettingsSuccess(true);
                setTimeout(() => setSaveSettingsSuccess(false), 3000);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white hover:text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> Save CMS System Settings
            </button>
          </div>

          {saveSettingsSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-center text-xs font-bold animate-bounce shadow-xs">
              ✓ IT System changes saved successfully & applied dynamically across the memo portal interface!
            </div>
          )}

                    {/* Secondary Sub-Tabs for settings organization */}
          <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1.5 select-none">
            <button
              type="button"
              onClick={() => setSettingsCategory('branding')}
              className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-xs font-bold ${
                settingsCategory === 'branding' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/55' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              🎨 Themes & Identity
            </button>
            <button
              type="button"
              onClick={() => setSettingsCategory('colors')}
              className={`py-2 px-3 rounded-lg text-center transition-all select-none cursor-pointer text-xs font-bold ${
                settingsCategory === 'colors' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/55' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              💅 UI Color Palette
            </button>
            <button
              type="button"
              onClick={() => setSettingsCategory('fiscal')}
              className={`py-2 px-3 rounded-lg text-center transition-all select-none cursor-pointer text-xs font-bold ${
                settingsCategory === 'fiscal' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/55' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              ₦ Policy Limits
            </button>
            <button
              type="button"
              onClick={() => setSettingsCategory('support')}
              className={`py-2 px-3 rounded-lg text-center transition-all select-none cursor-pointer text-xs font-bold ${
                settingsCategory === 'support' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/55' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              🛠️ Emergency Control
            </button>
          </div>

          {/* Render individual settings views */}
          {settingsCategory === 'branding' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-6 shadow-xs animate-fade-in text-left">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-150 pb-2.5 flex items-center gap-2 font-sans">
                <Palette className="w-4 h-4 text-blue-500" /> Dynamic Branding & Themes
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Theme Color Brand Palette Accent</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'default', label: 'Vetiva Default' },
                      { id: 'blue', label: 'Ocean Blue' },
                      { id: 'purple', label: 'Velvet Purple' },
                      { id: 'emerald', label: 'Emerald Green' },
                      { id: 'crimson', label: 'Venetian Red' },
                      { id: 'orange', label: 'Tech Orange' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCmsAccent(opt.id as any)}
                        className={`p-2 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                          cmsAccent === opt.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Sizing Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Corner Border Sizing Style</label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'default', label: 'Standard Round', desc: 'Smooth default responsive curve' },
                      { id: 'rounded', label: 'Fluid Round (Highly Rounded Theme Preset)', desc: 'Pronounced circular corners' },
                      { id: 'sharp', label: 'Brutalist Sharp', desc: 'No curves, precise straight box borders' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCmsBorder(opt.id as any)}
                        className={`w-full p-2.5 rounded-xl text-left text-xs transition-all border cursor-pointer block ${
                          cmsBorder === opt.id 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-bold">{opt.label}</div>
                        <div className={`text-[10px] sm:inline block ${cmsBorder === opt.id ? 'text-white/80' : 'text-slate-400'}`}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Company Label / Custom Header */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Custom App Header / Logo Title text</label>
                  <input
                    type="text"
                    value={cmsLogoText}
                    onChange={(e) => setCmsLogoText(e.target.value)}
                    placeholder="e.g. Internal Memo System"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Changes the primary name of the app shown in top-left banner layouts.</span>
                </div>

                {/* Logo File Selector and URL input */}
                <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono flex items-center gap-1">
                    <span>Company Logo Asset</span>
                  </label>
                  
                  {cmsLogoUrl && (
                    <div className="h-10 w-fit max-w-[200px] flex items-center bg-white border border-slate-200 rounded-lg p-2.5 mb-2 overflow-hidden shadow-2xs">
                      <img src={cmsLogoUrl} alt="Logo Preview" className="h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      id="cms-logo-url-input"
                      value={cmsLogoUrl}
                      onChange={(e) => setCmsLogoUrl(e.target.value)}
                      placeholder="Input asset image URL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileSelection}
                        className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1 min-w-0"
                      />
                      <button
                        type="button"
                        id="cms-logo-btn-upload"
                        onClick={handleUploadLogo}
                        disabled={logoUploadLoading}
                        className="px-2.5 py-1 bg-slate-800 text-white rounded text-[11px] hover:bg-slate-900 cursor-pointer text-xs disabled:opacity-50"
                      >
                        {logoUploadLoading ? 'Sending...' : 'Upload'}
                      </button>
                    </div>
                    {logoUploadStatus && <div className="text-[10px] antialiased text-blue-600 font-bold">{logoUploadStatus}</div>}
                  </div>
                </div>

                {/* Login Background Selector and URL input */}
                <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Login Screen backdrop wallpaper</label>
                  
                  {cmsBackgroundUrl && (
                    <div className="h-10 w-fit max-w-[200px] flex items-center bg-white border border-slate-200 rounded-lg p-2.5 mb-2 overflow-hidden shadow-2xs">
                      <img src={cmsBackgroundUrl} alt="Backdrop Preview" className="h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      id="cms-bg-url-input"
                      value={cmsBackgroundUrl}
                      onChange={(e) => setCmsBackgroundUrl(e.target.value)}
                      placeholder="Input graphic image URL"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    
                    <div className="flex gap-2 items-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundFileSelection}
                        className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 flex-1 min-w-0"
                      />
                      <button
                        type="button"
                        id="cms-bg-btn-upload"
                        onClick={handleUploadBackground}
                        disabled={backgroundUploadLoading}
                        className="px-2.5 py-1 bg-slate-800 text-white rounded text-[11px] hover:bg-slate-900 cursor-pointer text-xs disabled:opacity-50"
                      >
                        {backgroundUploadLoading ? 'Sending...' : 'Upload'}
                      </button>
                    </div>
                    {backgroundUploadStatus && <div className="text-[10px] antialiased text-blue-600 font-bold">{backgroundUploadStatus}</div>}
                  </div>
                </div>

              </div>
            </div>
          )}

          {settingsCategory === 'colors' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs animate-fade-in space-y-6 text-left">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-150 pb-2.5 flex items-center gap-2 font-sans font-bold">
                <Paintbrush className="w-4 h-4 text-blue-500" /> UI Custom Palette Configuration & Live Preview
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Form controls */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Authentication Card Base Frame</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cmsFrameColor}
                        onChange={(e) => setCmsFrameColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={cmsFrameColor}
                        onChange={(e) => setCmsFrameColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Data Table Borders</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cmsTableColor}
                        onChange={(e) => setCmsTableColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={cmsTableColor}
                        onChange={(e) => setCmsTableColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Primary Default Icon Hue</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cmsIconColor}
                        onChange={(e) => setCmsIconColor(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={cmsIconColor}
                        onChange={(e) => setCmsIconColor(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Interactive Button Fill Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cmsButtonBg}
                        onChange={(e) => setCmsButtonBg(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={cmsButtonBg}
                        onChange={(e) => setCmsButtonBg(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Button Font Text Color</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={cmsButtonText}
                        onChange={(e) => setCmsButtonText(e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-lg cursor-pointer p-0 shrink-0"
                      />
                      <input
                        type="text"
                        value={cmsButtonText}
                        onChange={(e) => setCmsButtonText(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Interactive Live Preview Mock widget */}
                <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono mb-2">👇 Dynamic Coloring Live Preview Preview (Unsaved)</span>
                  
                  {/* Mock auth screen box */}
                  <div className="p-4 border rounded-xl shadow-xs" style={{ backgroundColor: cmsFrameColor, borderColor: cmsTableColor }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cmsIconColor}20` }}>
                        <ShieldCheck className="w-4 h-4" style={{ color: cmsIconColor }} />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Dynamic Card Mockup</span>
                    </div>

                    <div className="border border-dashed p-3 rounded-lg bg-white mb-3" style={{ borderColor: cmsTableColor }}>
                      <p className="text-[10px] text-slate-500 font-semibold mb-2">Border color styling uses the Table Border Color:</p>
                      
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b" style={{ borderColor: cmsTableColor }}>
                            <th className="text-[9px] font-bold text-slate-400 uppercase tracking-wider py-1 font-mono">Mock Field</th>
                            <th className="text-[9px] font-bold text-slate-400 uppercase tracking-wider py-1 font-mono text-right">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b" style={{ borderColor: cmsTableColor }}>
                            <td className="text-[10px] font-bold text-slate-600 py-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cmsIconColor }}></span> Value
                            </td>
                            <td className="text-[10px] font-bold text-slate-800 py-1 text-right">₦1,500,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        style={{ backgroundColor: cmsButtonBg, color: cmsButtonText }}
                        className="text-[10px] font-extrabold px-3 py-1.5 rounded-lg shadow-sm font-sans transition-all active:scale-95 cursor-default hover:opacity-90 animate-pulse-subtle"
                      >
                        Interactive Button UI Mockup
                      </button>
                    </div>

                  </div>

                  <p className="text-[9px] text-slate-400 italic font-mono uppercase">This card updates automatically as you slide color selectors or input hex keys.</p>
                </div>

              </div>
            </div>
          )}

          {settingsCategory === 'fiscal' && (
            <div className="bg-white border border-slate-200 p-6 rounded-2xl md:max-w-xl mx-auto shadow-xs animate-fade-in space-y-5 text-left">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-150 pb-2.5 flex items-center gap-2 font-sans font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Cash Advance Fiscal Policy Rules Definitions
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Max Cash Advance Request Limit (₦)</label>
                  <input
                    type="number"
                    value={cmsMaxAdvance}
                    onChange={(e) => setCmsMaxAdvance(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Stops staff from logging requisitions exceeding this absolute limit value.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Mandatory Payout Retirement Timeline (Days)</label>
                  <input
                    type="number"
                    value={cmsRetireDays}
                    onChange={(e) => setCmsRetireDays(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">The maximum grace timeline in days granted to reconcile files post-payment before flagging overdue warnings.</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Executive Director Screening Trigger (₦)</label>
                  <input
                    type="number"
                    value={cmsExecThreshold}
                    onChange={(e) => setCmsExecThreshold(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Requisitions strictly exceeding this value require final Board/Executive approval.</span>
                </div>
              </div>
            </div>
          )}

          {settingsCategory === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
              
              {/* IT Support settings */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-xs">
                <h4 className="text-sm font-bold text-slate-800 border-b border-slate-150 pb-2.5 flex items-center gap-2 font-sans font-bold">
                  <Laptop className="w-4 h-4 text-blue-500" /> IT Support Channel Details
                </h4>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Support Helpline Email Address</label>
                    <input
                      type="email"
                      value={cmsSupportEmail}
                      onChange={(e) => setCmsSupportEmail(e.target.value)}
                      placeholder="e.g. it-support@vetivagroup.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block font-mono">Support Hotline Phone details</label>
                    <input
                      type="text"
                      value={cmsSupportPhone}
                      onChange={(e) => setCmsSupportPhone(e.target.value)}
                      placeholder="e.g. +234 1 270 9650"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150 select-none">
                    <input
                      type="checkbox"
                      id="cms-debug-box-check"
                      checked={cmsDebugEnabled}
                      onChange={(e) => setCmsDebugEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="cms-debug-box-check" className="text-xs font-bold text-slate-700 cursor-pointer block select-none">IT Sandbox Debug Mode</label>
                      <span className="text-[10px] text-slate-400 block leading-tight">Enables local testing diagnostic alerts and database status logs.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger operations reset center */}
              <div className="bg-rose-50/50 border border-rose-200 p-6 rounded-2xl space-y-5 shadow-xs">
                <h4 className="text-sm font-bold text-rose-800 border-b border-rose-150 pb-2.5 flex items-center gap-2 font-sans font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Dangerous Administrative Area
                </h4>

                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-left">
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block font-mono mb-1">🚨 CRITICAL WARNING 🚨</span>
                  <p className="text-[10px] text-rose-700 leading-normal font-sans">
                    These operations bypass typical transactional state checks and permanently delete data from memory permanently. Always use extreme caution.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    id="flush-advances-btn"
                    onClick={() => {
                      if (confirm("🚨 EMERGENCY ACTION 🚨\nAre you sure you want to permanently delete ALL Cash Advance requests? This action is irreversible and clears all active lists.")) {
                        onPurgeAdvances();
                        alert("Database cleaned: All Cash Advance requests permanently purged.");
                      }
                    }}
                    className="w-full py-2.5 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer hover:shadow-xs active:scale-98"
                  >
                    🧨 Clear Cash Advance Database ({advances.length} records)
                  </button>

                  <button
                    type="button"
                    id="flush-retirements-btn"
                    onClick={() => {
                      if (confirm("🚨 EMERGENCY ACTION 🚨\nAre you sure you want to permanently delete ALL expensed retirement files? This will reset matching advance reconciliations.")) {
                        onPurgeRetirements();
                        alert("Database cleaned: All retirements data permanently purged.");
                      }
                    }}
                    className="w-full py-2.5 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer hover:shadow-xs active:scale-98"
                  >
                    🧨 Clear Retirements Database ({retirements.length} records)
                  </button>

                  <button
                    type="button"
                    id="emergency-factory-reset-btn"
                    onClick={() => {
                      if (confirm("🚨 EMERGENCY ACTION 🚨\nAre you sure you want to restore pristine default corporate structures, email templates, users, and wipe active collections? This reloads seed profiles.")) {
                        onResetFactoryDefault();
                        alert("Factory default presets loaded. Database clean and complete.");
                      }
                    }}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shadow-rose-100 active:scale-98"
                  >
                    ⚡ Full Factory Hard Reset System Defaults
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

        </div> {/* closing lg:col-span-9 space-y-6 */}
      </div> {/* closing grid grid-cols-1 lg:grid-cols-12 gap-6 items-start */}


      {/* Sent Email Log Viewer Code Backdrop Modal */}
      {viewingEmailBody && (
        <div id="email-log-preview-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="bg-white border rounded-2xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl">
            
            <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex justify-between items-center rounded-t-2xl">
              <div className="min-w-0">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Sent email log preview</span>
                <h4 className="font-bold text-xs truncate mt-1 text-slate-100">Subject: {viewingEmailSubject}</h4>
              </div>
              <button
                id="close-email-log-modal"
                onClick={() => { setViewingEmailBody(null); setViewingEmailSubject(null); }}
                className="text-slate-400 hover:text-white font-mono text-base font-bold select-none p-1 shrink-0 px-2"
                title="Close receipt copy"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div className="bg-white rounded-xl border border-slate-205 shadow-sm overflow-hidden min-h-[400px]">
                <div dangerouslySetInnerHTML={{ __html: viewingEmailBody }} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                id="close-email-log-footer-btn"
                onClick={() => { setViewingEmailBody(null); setViewingEmailSubject(null); }}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-4 rounded-lg cursor-pointer"
              >
                Close Audit Inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
