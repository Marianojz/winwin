/**
 * Utilidades para optimizar la compatibilidad con password managers
 * (Google Password Manager, LastPass, 1Password, Bitwarden, etc.)
 */

/**
 * Atributos recomendados para inputs de password en formularios de registro
 */
export const PASSWORD_INPUT_ATTRIBUTES = {
  // Para registro - indica que es una nueva contraseña
  newPassword: {
    autoComplete: 'new-password' as const,
    'data-lpignore': 'false' as const,
    'data-form-type': 'password' as const,
    'data-1p-ignore': 'false' as const,
    'data-bwignore': 'false' as const,
    'data-google-password-manager': 'ignore' as const
  },
  // Para confirmación de contraseña
  confirmPassword: {
    autoComplete: 'new-password' as const,
    'data-lpignore': 'false' as const,
    'data-form-type': 'password' as const,
    'data-1p-ignore': 'false' as const,
    'data-bwignore': 'false' as const,
    'data-google-password-manager': 'ignore' as const
  },
  // Para login - contraseña existente
  currentPassword: {
    autoComplete: 'current-password' as const,
    'data-lpignore': 'false' as const,
    'data-form-type': 'password' as const,
    'data-1p-ignore': 'false' as const,
    'data-bwignore': 'false' as const,
    'data-google-password-manager': 'ignore' as const
  }
};

/**
 * Atributos recomendados para inputs de email
 */
export const EMAIL_INPUT_ATTRIBUTES = {
  autoComplete: 'email' as const,
  'data-lpignore': 'false' as const,
  'data-1p-ignore': 'false' as const,
  'data-bwignore': 'false' as const,
  type: 'email' as const
};

/**
 * Atributos recomendados para inputs de teléfono
 * Incluye "username" en autocomplete para que los gestores lo reconozcan como campo de usuario
 */
export const PHONE_INPUT_ATTRIBUTES = {
  autoComplete: 'tel username' as const,
  'data-lpignore': 'false' as const,
  'data-1p-ignore': 'false' as const,
  'data-bwignore': 'false' as const,
  type: 'tel' as const,
  'data-username-field': 'true' as const
};

/**
 * Atributos recomendados para inputs de nombre
 */
export const NAME_INPUT_ATTRIBUTES = {
  autoComplete: 'name' as const,
  'data-lpignore': 'false' as const,
  'data-1p-ignore': 'false' as const,
  'data-bwignore': 'false' as const,
  type: 'text' as const
};

/**
 * Valida que un formulario tenga la estructura correcta para password managers
 */
export const validateFormStructure = (formElement: HTMLFormElement): boolean => {
  const emailInput = formElement.querySelector('input[type="email"]');
  const passwordInput = formElement.querySelector('input[type="password"]');
  
  if (!emailInput || !passwordInput) {
    console.warn('Formulario no tiene estructura completa para password managers');
    return false;
  }

  // Verificar que los autocomplete estén correctos
  const emailAutocomplete = emailInput.getAttribute('autocomplete');
  const passwordAutocomplete = passwordInput.getAttribute('autocomplete');

  if (emailAutocomplete !== 'email') {
    console.warn('Input de email debe tener autocomplete="email"');
    return false;
  }

  // Para registro, debe ser 'new-password'
  const isRegisterForm = formElement.id?.includes('register') || 
                         formElement.name?.includes('register');
  
  if (isRegisterForm && passwordAutocomplete !== 'new-password') {
    console.warn('Input de password en registro debe tener autocomplete="new-password"');
    return false;
  }

  return true;
};

/**
 * Previene advertencias innecesarias de password managers
 * Evita validaciones agresivas que puedan confundir a los gestores
 */
export const preventPasswordManagerWarnings = (formElement: HTMLFormElement) => {
  // Agregar atributos que ayudan a los password managers
  formElement.setAttribute('autocomplete', 'on');
  
  // Prevenir que los password managers ignoren el formulario
  const inputs = formElement.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type === 'password' || input.type === 'email') {
      input.setAttribute('data-lpignore', 'false');
      input.setAttribute('data-1p-ignore', 'false');
      input.setAttribute('data-bwignore', 'false');
    }
  });
};

/**
 * Configuración recomendada para formularios de registro
 */
export const REGISTER_FORM_CONFIG = {
  formId: 'register-form',
  formName: 'register-form',
  autocomplete: 'on' as const,
  // Atributos para prevenir advertencias
  attributes: {
    'data-password-manager-friendly': 'true'
  }
};

/**
 * Configuración recomendada para formularios de login
 */
export const LOGIN_FORM_CONFIG = {
  formId: 'login-form',
  formName: 'login-form',
  autocomplete: 'on' as const,
  attributes: {
    'data-password-manager-friendly': 'true'
  }
};

