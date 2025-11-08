import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, syncUserToRealtimeDb } from '../config/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

const GoogleSignIn = () => {
  const { setUser } = useStore();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      // Limpiar estado previo
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await auth.signOut();
        }
      } catch (signOutErr) {
        console.warn('Error al hacer signOut previo:', signOutErr);
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Intentar con popup, si falla usar redirect en móvil
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        // Si es error de popup bloqueado (móvil), usar redirect
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          const { signInWithRedirect, getRedirectResult } = await import('firebase/auth');
          await signInWithRedirect(auth, provider);
          // El redirect manejará el resultado
          return;
        }
        throw popupError;
      }
      
      const user = result.user;

      // Verificar si el usuario ya existe en Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let needsCompleteProfile = false;

      if (!userDoc.exists()) {
        // Usuario nuevo - crear documento básico
        await setDoc(userDocRef, {
          username: user.displayName || 'Usuario',
          email: user.email!,
          avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&size=200&background=FF6B00&color=fff&bold=true`,
          dni: '',
          address: '',
          locality: '',
          province: '',
          latitude: 0,
          longitude: 0,
          mapAddress: '',
          createdAt: new Date().toISOString(),
          emailVerified: true,
          role: 'user',
          isAdmin: false,
          active: true
        });
        needsCompleteProfile = true;
      } else {
        // Usuario existente - actualizar avatar de Google si está disponible
        const userData = userDoc.data();
        if (user.photoURL && user.photoURL !== userData.avatar) {
          // Actualizar avatar de Google en Firestore
          await setDoc(userDocRef, {
            ...userData,
            avatar: user.photoURL
          }, { merge: true });
        }
        // Verificar si tiene dirección
        if (!userData.dni || !userData.address || userData.latitude === 0) {
          needsCompleteProfile = true;
        }
      }

      // Cargar datos actualizados del usuario
      const updatedUserDoc = await getDoc(userDocRef);
      const userData = updatedUserDoc.data();

      // Priorizar siempre el avatar de Google si está disponible
      const googleAvatar = user.photoURL || '';
      const savedAvatar = userData?.avatar || '';
      const finalAvatar = googleAvatar || savedAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || userData?.username || 'U')}&size=200&background=FF6B00&color=fff&bold=true`;
      
      const fullUser: User = {
        id: user.uid,
        email: user.email!,
        username: userData?.username || user.displayName || 'Usuario',
        avatar: finalAvatar,
        isAdmin: userData?.role === 'admin' || userData?.isAdmin === true,
        dni: userData?.dni || '',
        createdAt: userData?.createdAt ? new Date(userData.createdAt) : new Date(),
        address: userData?.address && userData?.latitude ? {
          street: userData.address,
          locality: userData.locality,
          province: userData.province,
          location: {
            lat: userData.latitude || 0,
            lng: userData.longitude || 0
          }
        } : undefined
      };

      // Sincronizar isAdmin a Realtime Database para que las reglas funcionen
      await syncUserToRealtimeDb(
        fullUser.id,
        fullUser.isAdmin,
        fullUser.email,
        fullUser.username
      );

      setUser(fullUser);
      localStorage.setItem('user', JSON.stringify(fullUser));

      // Redirigir según si necesita completar perfil
      if (needsCompleteProfile) {
        navigate('/completar-perfil');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error con Google Sign-In:', error);
      alert('Error al iniciar sesión con Google. Intentá nuevamente.');
    }
  };

  return (
    <button
      onClick={handleGoogleSignIn}
      type="button"
      style={{
        width: '100%',
        padding: '0.875rem',
        background: 'white',
        color: '#333',
        border: '2px solid var(--border)',
        borderRadius: '0.75rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <img 
        src="https://www.google.com/favicon.ico" 
        alt="Google" 
        style={{ width: '20px', height: '20px' }}
      />
      Continuar con Google
    </button>
  );
};

export default GoogleSignIn;
