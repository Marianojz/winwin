import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';

const GoogleSignIn = () => {
  const { setUser } = useStore();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
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
        // Usuario existente - verificar si tiene dirección
        const userData = userDoc.data();
        if (!userData.dni || !userData.address || userData.latitude === 0) {
          needsCompleteProfile = true;
        }
      }

      // Cargar datos actualizados del usuario
      const updatedUserDoc = await getDoc(userDocRef);
      const userData = updatedUserDoc.data();

      const fullUser: User = {
        id: user.uid,
        email: user.email!,
        username: userData?.username || user.displayName || 'Usuario',
        avatar: user.photoURL || userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&size=200&background=FF6B00&color=fff&bold=true`,
        isAdmin: userData?.role === 'admin',
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
