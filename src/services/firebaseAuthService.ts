import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { UserRole } from '../types';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, firestore, storage, isConfigured } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isFirebaseMockEnabled(): boolean {
  return localStorage.getItem('vite_use_firebase_mock') === 'true' ||
         import.meta.env.VITE_USE_FIREBASE_MOCK === 'true' ||
         !isConfigured || !auth || !firestore || !storage;
}

export function enableFirebaseMock(enable: boolean = true) {
  if (enable) {
    localStorage.setItem('vite_use_firebase_mock', 'true');
  } else {
    localStorage.removeItem('vite_use_firebase_mock');
  }
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  portal_identity?: string;
  role: string;
  profile_picture_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

class FirebaseAuthService {
  private userKey = 'auth_user';
  private tokenKey = 'auth_token';

  private mapPortalIdentityToRole(portalIdentity?: string): UserRole {
    const roleMapping: Record<string, UserRole> = {
      'Initiator': UserRole.ADMIN_OFFICER,
      'IT Support': UserRole.SYSTEM_ADMIN,
      'Line Manager': UserRole.HEAD_OF_ADMIN,
      'Internal Control': UserRole.INTERNAL_CONTROL,
      'Executive Manager': UserRole.EXECUTIVE_DIRECTOR,
      'Executive Director': UserRole.EXECUTIVE_DIRECTOR,
      'Finance': UserRole.FINANCE_OFFICER
    };

    if (portalIdentity && roleMapping[portalIdentity]) {
      return roleMapping[portalIdentity];
    }

    return UserRole.ADMIN_OFFICER;
  }

  // Accept a variety of role labels (legacy or alternate spellings) and map them to UserRole
  private parseRoleString(role?: string): UserRole | undefined {
    if (!role) return undefined;
    const normalized = role.trim().toLowerCase();
    if (Object.values(UserRole).map(v => v.toLowerCase()).includes(normalized)) {
      // It's already one of the enum display labels
      return Object.values(UserRole).find(v => v.toLowerCase() === normalized) as UserRole;
    }

    // Common legacy/alternate labels mapping
    if (normalized.includes('head') && (normalized.includes('admin') || normalized.includes('administration'))) return UserRole.HEAD_OF_ADMIN;
    if (normalized.includes('internal')) return UserRole.INTERNAL_CONTROL;
    if (normalized.includes('executive')) return UserRole.EXECUTIVE_DIRECTOR;
    if (normalized.includes('finance')) return UserRole.FINANCE_OFFICER;
    if (normalized.includes('system') || normalized.includes('it')) return UserRole.SYSTEM_ADMIN;
    if (normalized.includes('initiator') || normalized.includes('admin officer')) return UserRole.ADMIN_OFFICER;

    return undefined;
  }

  /**
   * Register a new user with email, password, and optional profile picture
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    portalIdentity?: string,
    profilePicture?: File | null
  ): Promise<AuthResponse> {
    if (isFirebaseMockEnabled()) {
      // Fallback local dev implementation when mock is enabled: store mock user in localStorage
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      if (users.find(u => u.email === email)) {
        throw new Error('That email is already registered. Please login or use a different address.');
      }
      const id = `mock-${Date.now()}`;
      const user: AuthUser = {
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        department: 'General',
        portal_identity: portalIdentity,
        role: this.mapPortalIdentityToRole(portalIdentity),
        profile_picture_url: undefined,
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };
      users.push({ ...user, password: password });
      localStorage.setItem(mockUsersKey, JSON.stringify(users));
      const token = `mock-token-${Date.now()}`;
      localStorage.setItem(this.tokenKey, token);
      this.setUser(user);
      return { token, expiresIn: '0', user };
    }

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await firebaseUpdateProfile(firebaseUser, {
        displayName: `${firstName} ${lastName}`
      });

      let profilePictureUrl: string | undefined;

      // Upload profile picture if provided
      if (profilePicture) {
        try {
          const fileName = `${firebaseUser.uid}-${Date.now()}`;
          const imageRef = storageRef(storage, `profile-pictures/${fileName}`);
          await uploadBytes(imageRef, profilePicture);
          profilePictureUrl = await getDownloadURL(imageRef);
        } catch (error) {
          console.error('Profile picture upload failed:', error);
          // Continue even if profile picture upload fails
        }
      }

      // Create user document in Firestore
      const userRole = this.mapPortalIdentityToRole(portalIdentity);

      const userData: Omit<AuthUser, 'id'> = {
        email,
        first_name: firstName,
        last_name: lastName,
        department: 'General',
        portal_identity: portalIdentity,
        role: userRole,
        ...(profilePictureUrl ? { profile_picture_url: profilePictureUrl } : {}),
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };

      const userRef = doc(firestore, 'users', firebaseUser.uid);
      try {
        await setDoc(userRef, userData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }

      const token = await firebaseUser.getIdToken();
      const expiresIn = '1h'; // Firebase tokens expire in 1 hour

      const user: AuthUser = {
        id: firebaseUser.uid,
        ...userData
      };

      this.setUser(user);

      if (profilePicture) {
        void this.uploadProfilePicture(firebaseUser.uid, profilePicture)
          .then(async (uploadedUrl) => {
            const updatedUser: AuthUser = {
              ...user,
              profile_picture_url: uploadedUrl
            };

            try {
              try {
                await updateDoc(userRef, { profile_picture_url: uploadedUrl });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
              }
              this.setUser(updatedUser);
            } catch (error) {
              console.error('Failed to update profile picture URL after async upload:', error);
            }
          })
          .catch((error) => {
            console.error('Background profile picture upload failed:', error);
          });
      }

      return {
        token,
        expiresIn,
        user
      };
    } catch (error: any) {
      console.error('Firebase register error:', error?.code || 'no-code', error?.message || String(error), error);
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('That email is already registered. Please login or use a different address.');
      }
      if (error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed')) {
        enableFirebaseMock(true);
        sessionStorage.setItem('firebase_auto_healed_sandbox', 'true');
        console.warn('Auto-healing: Switched to sandbox mode due to un-configured Email/Password authentication provider.');
        return this.register(email, password, firstName, lastName, portalIdentity, profilePicture);
      }
      throw new Error(error?.message || 'Registration failed');
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    if (isFirebaseMockEnabled()) {
      // Local mock login
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const match = users.find(u => u.email === email && u.password === password);
      if (!match) {
        throw new Error('Invalid credentials (mock)');
      }
      const user: AuthUser = {
        id: match.id,
        email: match.email,
        first_name: match.first_name,
        last_name: match.last_name,
        department: match.department,
        portal_identity: match.portal_identity,
        role: match.role,
        profile_picture_url: match.profile_picture_url,
        is_active: match.is_active,
        is_verified: match.is_verified,
        created_at: match.created_at
      };
      const token = `mock-token-${Date.now()}`;
      localStorage.setItem(this.tokenKey, token);
      this.setUser(user);
      return { token, expiresIn: '0', user };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const user = await this.ensureUserProfile(firebaseUser);
      const token = await firebaseUser.getIdToken();
      const expiresIn = '1h';

      // Store token in localStorage for authClient to use in admin API calls
      localStorage.setItem(this.tokenKey, token);
      this.setUser(user);

      return {
        token,
        expiresIn,
        user
      };
    } catch (error: any) {
      console.error('Firebase login error:', error?.code || 'no-code', error?.message || String(error), error);
      if (error?.code === 'auth/operation-not-allowed' || error?.message?.includes('operation-not-allowed')) {
        enableFirebaseMock(true);
        // Let's check if the mock user exists. If not, let's quickly register/seed them as a mock user so they don't get 'Invalid credentials (mock)'
        const mockUsersKey = 'mock_users';
        const usersJson = localStorage.getItem(mockUsersKey) || '[]';
        const users = JSON.parse(usersJson) as any[];
        const hasUser = users.some(u => u.email === email);
        if (!hasUser) {
          const mockUser = {
            id: `mock-${Math.random().toString(36).substr(2, 9)}`,
            email: email,
            password: password,
            first_name: email.split('@')[0],
            last_name: 'User',
            role: this.mapPortalIdentityToRole(undefined),
            is_active: true,
            is_verified: true,
            created_at: new Date().toISOString()
          };
          users.push(mockUser);
          localStorage.setItem(mockUsersKey, JSON.stringify(users));
        }
        sessionStorage.setItem('firebase_auto_healed_sandbox', 'true');
        console.warn('Auto-healing: Switched to sandbox mode due to un-configured Email/Password authentication provider during login.');
        return this.login(email, password);
      }
      throw new Error(error.message || 'Login failed');
    }
  }

  private async ensureUserProfile(firebaseUser: FirebaseUser): Promise<AuthUser> {
    if (isFirebaseMockEnabled()) {
      // Attempt to find mock user
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const match = firebaseUser ? users.find(u => u.id === firebaseUser.uid) : undefined;
      if (match) {
        return {
          id: match.id,
          email: match.email,
          first_name: match.first_name,
          last_name: match.last_name,
          department: match.department,
          portal_identity: match.portal_identity,
          role: match.role,
          profile_picture_url: match.profile_picture_url,
          is_active: match.is_active,
          is_verified: match.is_verified,
          created_at: match.created_at
        };
      }
    }
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    let userDoc;
    try {
      userDoc = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }

    if (userDoc.exists()) {
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;
      const parsedRole = this.parseRoleString(userData.role as string | undefined);
      const normalizedRole = userData.portal_identity
        ? this.mapPortalIdentityToRole(userData.portal_identity)
        : (parsedRole || UserRole.ADMIN_OFFICER);
      const normalizedUserData: Omit<AuthUser, 'id'> = {
        ...userData,
        role: normalizedRole
      };

      if (normalizedRole !== userData.role) {
        try {
          await updateDoc(userRef, { role: normalizedRole });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
        }
      }

      return {
        id: firebaseUser.uid,
        ...normalizedUserData
      };
    }

    const displayName = firebaseUser.displayName || '';
    const [firstName, ...nameParts] = displayName.split(' ');
    const lastName = nameParts.join(' ') || '';
    const userData: Omit<AuthUser, 'id'> = {
      email: firebaseUser.email || '',
      first_name: firstName || 'Unknown',
      last_name: lastName || '',
      department: 'General',
      role: UserRole.ADMIN_OFFICER,
      ...(firebaseUser.photoURL ? { profile_picture_url: firebaseUser.photoURL } : {}),
      is_active: true,
      is_verified: firebaseUser.emailVerified || false,
      created_at: new Date().toISOString()
    };

    try {
      await setDoc(userRef, userData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
    }

    return {
      id: firebaseUser.uid,
      ...userData
    };
  }

  /**
   * OAuth login - Sign up or login with OAuth provider
   * Note: For Google/Apple OAuth, use Firebase SDK's signInWithPopup or signInWithRedirect
   */
  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<{ message?: string }> {
    if (isFirebaseMockEnabled()) {
      // Mock behavior: Store email temporarily to identify user when resetting
      sessionStorage.setItem('mock_reset_password_email', email.trim());
      return { message: 'Password reset (mock) instruction generated locally.' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { message: 'Password reset email sent' };
    } catch (error: any) {
      console.error('Password reset request error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  /**
   * Reset password with token and new password
   * Note: In Firebase, you typically use the code from the email link
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (isFirebaseMockEnabled()) {
      const email = sessionStorage.getItem('mock_reset_password_email');
      if (!email) {
        throw new Error('No password reset flow detected. Please request a new verification email first.');
      }
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
      if (idx === -1) {
        throw new Error('User account not found or is un-synchronized inside sandbox database.');
      }
      users[idx].password = newPassword;
      localStorage.setItem(mockUsersKey, JSON.stringify(users));
      // update logged in user if currently authenticated match
      const current = this.getUser();
      if (current && current.email.toLowerCase() === email.toLowerCase()) {
        const updatedSes = { ...current } as any;
        updatedSes.password = newPassword;
        this.setUser(updatedSes);
      }
      sessionStorage.removeItem('mock_reset_password_email');
      return;
    }
    try {
      await confirmPasswordReset(auth, token, newPassword);
    } catch (error: any) {
      console.error('Reset password error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Verify email (Firebase handles this via email link in the UI)
   */
  async verifyEmail(token: string): Promise<void> {
    // Firebase handles email verification through action links
    // This is a placeholder for compatibility
    console.log('Email verification handled by Firebase');
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<AuthUser[]> {
    if (isFirebaseMockEnabled()) {
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      return users.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        department: u.department,
        portal_identity: u.portal_identity,
        role: u.role,
        profile_picture_url: u.profile_picture_url,
        is_active: u.is_active,
        is_verified: u.is_verified,
        created_at: u.created_at
      }));
    }
    try {
      let querySnapshot;
      try {
        querySnapshot = await getDocs(collection(firestore, 'users'));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
      const users: AuthUser[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data() as Omit<AuthUser, 'id'>;
        users.push({
          id: doc.id,
          ...userData
        });
      });

      return users;
    } catch (error: any) {
      console.error('getUsers error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  /**
   * Update user profile (admin endpoint)
   */
  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    role?: string;
    profilePictureUrl?: string;
    isActive?: boolean;
    resetPassword?: string;
  }): Promise<AuthUser> {
    if (isFirebaseMockEnabled()) {
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error('User not found (mock)');
      const user = users[idx];
      if (updates.firstName) user.first_name = updates.firstName;
      if (updates.lastName) user.last_name = updates.lastName;
      if (updates.department) user.department = updates.department;
      if (updates.role) user.role = updates.role;
      if (updates.profilePictureUrl) user.profile_picture_url = updates.profilePictureUrl;
      if (updates.isActive !== undefined) user.is_active = updates.isActive;
      if (updates.resetPassword) user.password = updates.resetPassword;
      users[idx] = user;
      localStorage.setItem(mockUsersKey, JSON.stringify(users));
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        portal_identity: user.portal_identity,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        is_active: user.is_active,
        is_verified: user.is_verified,
        created_at: user.created_at
      };
    }
    try {
      const userRef = doc(firestore, 'users', userId);

      // Prepare update object with Firestore-friendly keys
      const firestoreUpdate: Record<string, any> = {};
      if (updates.firstName) firestoreUpdate.first_name = updates.firstName;
      if (updates.lastName) firestoreUpdate.last_name = updates.lastName;
      if (updates.department) firestoreUpdate.department = updates.department;
      if (updates.role) firestoreUpdate.role = updates.role;
      if (updates.profilePictureUrl) firestoreUpdate.profile_picture_url = updates.profilePictureUrl;
      if (updates.isActive !== undefined) firestoreUpdate.is_active = updates.isActive;

      try {
        await updateDoc(userRef, firestoreUpdate);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }

      // Get updated user data
      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      }
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;

      return {
        id: userDoc.id,
        ...userData
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update user');
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser> {
    if (isFirebaseMockEnabled()) {
      const stored = this.getUser();
      if (stored) return stored;
      // Try reading mock token and user
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const token = localStorage.getItem(this.tokenKey);
      if (token && users.length > 0) {
        // return first mock user as current
        const u = users[0];
        const user: AuthUser = {
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          department: u.department,
          portal_identity: u.portal_identity,
          role: u.role,
          profile_picture_url: u.profile_picture_url,
          is_active: u.is_active,
          is_verified: u.is_verified,
          created_at: u.created_at
        };
        this.setUser(user);
        return user;
      }
      throw new Error('Firebase is not configured and no local mock user available. See FIREBASE_SETUP.md');
    }

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error('No user is currently authenticated');
      }

      const user = await this.ensureUserProfile(firebaseUser);

      // Refresh and store the token in localStorage for authClient
      const token = await firebaseUser.getIdToken();
      localStorage.setItem(this.tokenKey, token);
      
      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch user');
    }
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    profilePictureUrl?: string;
  }): Promise<AuthUser> {
    if (isFirebaseMockEnabled()) {
      const stored = this.getUser();
      if (!stored) throw new Error('No mock user authenticated');
      const updatedUser = {
        ...stored,
        first_name: updates.firstName || stored.first_name,
        last_name: updates.lastName || stored.last_name,
        department: updates.department || stored.department,
        profile_picture_url: updates.profilePictureUrl || stored.profile_picture_url
      };
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const idx = users.findIndex(u => u.id === stored.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updatedUser };
        localStorage.setItem(mockUsersKey, JSON.stringify(users));
      }
      this.setUser(updatedUser);
      return updatedUser;
    }

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error('No user is currently authenticated');
      }

      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const firestoreUpdate: Record<string, any> = {};

      if (updates.firstName) firestoreUpdate.first_name = updates.firstName;
      if (updates.lastName) firestoreUpdate.last_name = updates.lastName;
      if (updates.department) firestoreUpdate.department = updates.department;
      if (updates.profilePictureUrl) firestoreUpdate.profile_picture_url = updates.profilePictureUrl;

      try {
        await updateDoc(userRef, firestoreUpdate);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }

      // Update Firebase Auth profile
      if (updates.firstName || updates.lastName || updates.profilePictureUrl) {
        const profileUpdates: Record<string, string> = {};
        if (updates.firstName || updates.lastName) {
          profileUpdates.displayName = `${updates.firstName || ''} ${updates.lastName || ''}`.trim();
        }
        if (updates.profilePictureUrl) {
          profileUpdates.photoURL = updates.profilePictureUrl;
        }
        if (Object.keys(profileUpdates).length > 0) {
          await firebaseUpdateProfile(firebaseUser, profileUpdates);
        }
      }

      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
      }
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;
      const user: AuthUser = {
        id: firebaseUser.uid,
        ...userData
      };

      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Get current auth token
   */
  async getToken(): Promise<string | null> {
    try {
      return auth ? await auth.currentUser?.getIdToken() || null : null;
    } catch {
      return null;
    }
  }

  /**
   * Get stored user
   */
  getUser(): AuthUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Set stored user
   */
  setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return (auth && !!auth.currentUser) || !!this.getUser();
  }

  /**
   * Clear stored auth user data from local storage
   */
  clearStoredUser(): void {
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('ca_session_logged_in');
    localStorage.removeItem('ca_session_user_idx');
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      this.clearStoredUser();
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  /**
   * Get auth header for API calls
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    if (isFirebaseMockEnabled()) {
      const stored = this.getUser();
      if (!stored) throw new Error('No mock user authenticated');
      // Create a local blob URL for profile avatar preview in sandbox mode
      return URL.createObjectURL(file);
    }

    try {
      const fileName = `${userId}-${Date.now()}`;
      const imageRef = storageRef(storage, `profile-pictures/${fileName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);

      // Update user's profile picture URL in Firestore
      try {
        await updateDoc(doc(firestore, 'users', userId), {
          profile_picture_url: url
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }

      // Keep Firebase Auth profile in sync if available
      if (auth?.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { photoURL: url });
      }

      return url;
    } catch (error: any) {
      throw new Error(error.message || 'Profile picture upload failed');
    }
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(userId: string, pictureUrl: string): Promise<void> {
    if (isFirebaseMockEnabled()) {
      return;
    }

    try {
      // Delete from Storage
      const imageRef = storageRef(storage, pictureUrl);
      await deleteObject(imageRef);

      // Update user document
      try {
        await updateDoc(doc(firestore, 'users', userId), {
          profile_picture_url: null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }
    } catch (error: any) {
      throw new Error(error.message || 'Profile picture deletion failed');
    }
  }
}

export default new FirebaseAuthService();
