// Firebase Realtime Database imports
import { ref as dbRef, update, remove, onValue, off, set as firebaseSet, get } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Otras importaciones de Lucide, React, etc.
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Eye, Edit, Trash2, Users, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, DollarSign, Plus, XCircle,
  TrendingUp, ShoppingCart, Bell, AlertTriangle,
  Search, Filter, ShoppingBag, MapPin, BarChart3,
  MousePointerClick, Image as ImageIcon, Save, Store, Mail, Send,
  CheckCircle, Truck, FileText, Calendar, User, CreditCard,
  ArrowRight, ArrowDown, ArrowUp, Download, Trash, HelpCircle, Ticket as TicketIcon,
  MessageSquare, Palette, Shuffle, CheckSquare, Square
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserDetailsModal from '../components/UserDetailsModal';
import StatsCard from '../components/StatsCard';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus } from '../types';
import ImageUploader from '../components/ImageUploader';
import { mockCategories } from '../utils/mockData';
import { availableStickers, getStickerLabel } from '../utils/stickers';
import { logAdminAction, logAuctionAction, logProductAction, logOrderAction, logUserAction } from '../utils/actionLogger';
import { logOrderStatusChange, loadOrderTransactions } from '../utils/orderTransactions';
import { storage } from '../config/firebase';
import { ref as storageRef, listAll, deleteObject } from 'firebase/storage';
import { uploadImage } from '../utils/imageUpload';
import { HomeConfig, defaultHomeConfig, LogoSticker, ThemeColors } from '../types/homeConfig';
import { specialEvents, getCurrentSpecialEvents, getStickerForEvent } from '../utils/dateSpecialEvents';
import { 
  getAllConversations, 
  getMessages, 
  saveMessage, 
  markMessagesAsRead, 
  getAdminUnreadCount,
  createMessage,
  createAutoMessage,
  deleteConversation,
  deleteMessage,
  closeConversation,
  reopenConversation,
  watchConversationStatus,
  updateConversationPriority
} from '../utils/messages';
import { Message, Conversation, Ticket, TicketStatus, ContactMessage } from '../types';
import { 
  getAllTickets, 
  updateTicketStatus, 
  getAllContactMessages, 
  markContactMessageAsRead 
} from '../utils/tickets';
import { useIsMobile } from '../hooks/useMediaQuery';
import { trackingSystem } from '../utils/tracking';
import { actionLogger } from '../utils/actionLogger';
import { runCleanup } from '../utils/dataCleaner';
import { 
  loadMessageTemplates, 
  saveMessageTemplates, 
  updateMessageTemplate,
  getVariablesForType,
  renderTemplate,
  type MessageTemplate 
} from '../utils/messageTemplates';
import LogoManager from '../components/LogoManager';
import StickerManager from '../components/StickerManager';
import AnnouncementCreator from '../components/AnnouncementCreator';
import { Announcement } from '../types/announcements';
import { getAllAnnouncements, deleteAnnouncement } from '../utils/announcements';
import { getAllAnnouncementsMetrics, AnnouncementMetrics } from '../utils/announcementAnalytics';
import { 
  loadQuickReplies, 
  addQuickReply, 
  updateQuickReply, 
  deleteQuickReply, 
  getActiveQuickReplies,
  type QuickReply 
} from '../utils/quickReplies';
import { 
  getChatMetrics, 
  watchChatMetrics, 
  calculateResponseTime,
  type ChatMetrics,
  type ResponseTimeMetric 
} from '../utils/chatMetrics';
import {
  getUnifiedInbox,
  getUnreadCountsByType,
  getUnreadCountsByPriority,
  filterUnifiedMessages,
  getTypeBadge,
  getPriorityBadge,
  type UnifiedMessage,
  type UnifiedMessageType,
  type UnifiedMessagePriority
} from '../utils/unifiedInbox';
import './AdminPanel.css';

const AdminPanel = (): React.ReactElement => {
  const { 
    user, auctions, products, bots, orders, theme,
    addBot, updateBot, deleteBot, setProducts, setAuctions, setBots, setOrders, updateOrderStatus, loadBots,
    addAuction, updateAuction, deleteAuction,
    addNotification, clearNotifications
  } = useStore();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('dashboard');
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render sin recargar
  const [clearedActivityTimestamp, setClearedActivityTimestamp] = useState<number>(0); // Timestamp de actividad limpiada
  const [republishModal, setRepublishModal] = useState<{ show: boolean; auction: Auction | null }>({ show: false, auction: null });
  
  // Cargar bots desde Firebase al montar el componente
  useEffect(() => {
    if (user?.isAdmin) {
      loadBots();
      // Log silencioso - funcionalidad oculta del admin
    }
  }, [user?.isAdmin, loadBots]);

  // Los bots funcionan silenciosamente - funcionalidad oculta del admin
  
  // Limpiar duplicados de pedidos al montar el componente
  useEffect(() => {
    const currentOrders = orders;
    const uniqueOrders = currentOrders.filter((order: Order, index: number, self: Order[]) => 
      index === self.findIndex((o: Order) => o.id === order.id)
    );
    
    if (uniqueOrders.length < currentOrders.length) {
      console.log(`🧹 AdminPanel: Eliminando ${currentOrders.length - uniqueOrders.length} pedidos duplicados`);
      setOrders(uniqueOrders);
    }
  }, []); // Solo al montar
  
  // Cargar timestamp de actividad limpiada desde Firebase
  useEffect(() => {
    if (user?.id) {
      const timestampRef = dbRef(realtimeDb, `adminSettings/${user.id}/clearedActivityTimestamp`);
      const unsubscribe = onValue(timestampRef, (snapshot) => {
        const timestamp = snapshot.val();
        if (timestamp) {
          const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
          setClearedActivityTimestamp(timestampNum);
          // También guardar en localStorage para compatibilidad
          localStorage.setItem(`clearedActivityTimestamp_${user.id}`, timestampNum.toString());
        } else {
          // Si no hay en Firebase, intentar desde localStorage
          const localTimestamp = localStorage.getItem(`clearedActivityTimestamp_${user.id}`) || 
                                 localStorage.getItem('clearedActivityTimestamp');
          if (localTimestamp) {
            const timestampNum = parseInt(localTimestamp);
            setClearedActivityTimestamp(timestampNum);
          }
        }
      }, (error: any) => {
        // Si hay error de permisos, solo usar localStorage (no es crítico)
        if (error?.code === 'PERMISSION_DENIED') {
          console.log('ℹ️ No hay permisos para adminSettings, usando localStorage');
        } else {
          console.error('Error cargando timestamp de actividad:', error);
        }
        // Fallback a localStorage
        const localTimestamp = localStorage.getItem(`clearedActivityTimestamp_${user.id}`) || 
                               localStorage.getItem('clearedActivityTimestamp');
        if (localTimestamp) {
          const timestampNum = parseInt(localTimestamp);
          setClearedActivityTimestamp(timestampNum);
        }
      });
      
      return () => {
        off(timestampRef);
      };
    }
  }, [user?.id]);
  
  // Estado para configuración del inicio
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);
  // Estado para modo activo en editor de colores
  const [activeColorMode, setActiveColorMode] = useState<'light' | 'dark' | 'experimental'>('light');
  
  // Función para generar colores aleatorios complementarios
  const generateComplementaryColors = (): ThemeColors => {
    // Generar un color base aleatorio (hue entre 0-360)
    const baseHue = Math.floor(Math.random() * 360);
    
    // Calcular el color complementario (180 grados de diferencia)
    const complementaryHue = (baseHue + 180) % 360;
    
    // Función helper para convertir HSL a HEX
    const hslToHex = (h: number, s: number, l: number): string => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    };
    
    // Generar variaciones de saturación y luminosidad para crear una paleta armoniosa
    const primary = hslToHex(baseHue, 70 + Math.random() * 20, 45 + Math.random() * 15);
    const primaryHover = hslToHex(baseHue, 75 + Math.random() * 15, 35 + Math.random() * 10);
    const secondary = hslToHex(complementaryHue, 60 + Math.random() * 20, 50 + Math.random() * 15);
    
    // Fondos: usar colores más neutros pero relacionados
    const background = hslToHex(baseHue, 10 + Math.random() * 10, 95 + Math.random() * 3);
    const backgroundSecondary = hslToHex(baseHue, 15 + Math.random() * 10, 90 + Math.random() * 5);
    const backgroundTertiary = hslToHex(complementaryHue, 20 + Math.random() * 10, 85 + Math.random() * 5);
    
    // Textos: usar colores oscuros pero con matiz del color base
    const textPrimary = hslToHex(baseHue, 30 + Math.random() * 20, 15 + Math.random() * 10);
    const textSecondary = hslToHex(baseHue, 25 + Math.random() * 15, 40 + Math.random() * 15);
    
    // Bordes: tono intermedio
    const border = hslToHex(baseHue, 20 + Math.random() * 15, 70 + Math.random() * 15);
    
    // Estados: usar colores complementarios y análogos
    const success = hslToHex((baseHue + 120) % 360, 60 + Math.random() * 20, 45 + Math.random() * 15);
    const warning = hslToHex((baseHue + 60) % 360, 70 + Math.random() * 20, 50 + Math.random() * 15);
    const error = hslToHex((baseHue + 0) % 360, 70 + Math.random() * 20, 45 + Math.random() * 15);
    const info = hslToHex((baseHue + 240) % 360, 65 + Math.random() * 20, 50 + Math.random() * 15);
    
    return {
      primary,
      primaryHover,
      secondary,
      background,
      backgroundSecondary,
      backgroundTertiary,
      textPrimary,
      textSecondary,
      border,
      success,
      warning,
      error,
      info
    };
  };
  
  // Cargar homeConfig desde Firebase
  useEffect(() => {
    try {
      const homeConfigRef = dbRef(realtimeDb, 'homeConfig');
      
      const unsubscribe = onValue(homeConfigRef, (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
          setHomeConfig({
            ...defaultHomeConfig,
            ...data,
            siteSettings: {
              ...(data.siteSettings || defaultHomeConfig.siteSettings),
              logoStickers: data.siteSettings?.logoStickers || defaultHomeConfig.siteSettings.logoStickers || []
            },
            themeColors: data.themeColors || defaultHomeConfig.themeColors,
            themeColorSets: data.themeColorSets || defaultHomeConfig.themeColorSets,
            sectionTitles: data.sectionTitles || defaultHomeConfig.sectionTitles,
            banners: data.banners?.map((b: any) => ({
              ...b,
              createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
              updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined
            })) || [],
            promotions: data.promotions?.map((p: any) => ({
              ...p,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              startDate: p.startDate ? new Date(p.startDate) : undefined,
              endDate: p.endDate ? new Date(p.endDate) : undefined
            })) || [],
            aboutSection: data.aboutSection || defaultHomeConfig.aboutSection,
            contactSection: data.contactSection || defaultHomeConfig.contactSection,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
          });
          console.log('✅ Configuración de home cargada desde Firebase');
        } else {
          setHomeConfig(defaultHomeConfig);
        }
      }, (error) => {
        console.error('Error cargando configuración del inicio desde Firebase:', error);
        setHomeConfig(defaultHomeConfig);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error configurando listener de homeConfig:', error);
      setHomeConfig(defaultHomeConfig);
    }
  }, []);

  // Estados para templates de mensajes
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(() => loadMessageTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>('');
  
  // Estados para mensajería
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserForMessage, setSelectedUserForMessage] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'open' | 'closed'>('open');
  const [closingConversation, setClosingConversation] = useState(false);
  
  // Estados para plantillas de respuestas rápidas
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(() => loadQuickReplies());
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showQuickReplyEditor, setShowQuickReplyEditor] = useState(false);
  
  // Estados para métricas de chat
  const [chatMetrics, setChatMetrics] = useState<ChatMetrics | null>(null);
  const [showChatMetrics, setShowChatMetrics] = useState(false);
  const [selectedConversationMetric, setSelectedConversationMetric] = useState<ResponseTimeMetric | null>(null);
  
  // Estados para gestión múltiple
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  
  // Estados para bandeja unificada
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessage[]>([]);
  const [unifiedFilter, setUnifiedFilter] = useState<{
    type: UnifiedMessageType | 'all';
    priority: UnifiedMessagePriority | 'all';
    status: string | 'all';
    search: string;
    unreadOnly: boolean;
  }>({
    type: 'all',
    priority: 'all',
    status: 'all',
    search: '',
    unreadOnly: false
  });
  const [selectedUnifiedMessage, setSelectedUnifiedMessage] = useState<UnifiedMessage | null>(null);
  
  // Estados para tickets y mensajes de contacto
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | 'todos'>('todos');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  
  // Estados para anuncios
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementCreator, setShowAnnouncementCreator] = useState(false);
  const [announcementMetrics, setAnnouncementMetrics] = useState<any[]>([]);
  const [showAnnouncementMetrics, setShowAnnouncementMetrics] = useState(false);
  
  // Estados para búsqueda de usuarios
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const isMobile = useIsMobile();
  
  // Cargar conversaciones y contador en tiempo real
  useEffect(() => {
    if (activeTab === 'messages' || activeTab === 'unified-inbox') {
      // Escuchar conversaciones en tiempo real
      const unsubscribeConversations = getAllConversations((conversations) => {
        setConversations(conversations);
      });
      
      // Escuchar contador de no leídos en tiempo real
      const unsubscribeUnread = getAdminUnreadCount((count) => {
        setAdminUnreadCount(count);
      });
      
      // Cargar métricas de chat si están visibles (solo en messages)
      let unsubscribeMetrics: (() => void) | null = null;
      if (showChatMetrics && activeTab === 'messages') {
        unsubscribeMetrics = watchChatMetrics((metrics) => {
          setChatMetrics(metrics);
        });
      }
      
      return () => {
        unsubscribeConversations();
        unsubscribeUnread();
        if (unsubscribeMetrics) unsubscribeMetrics();
      };
    } else {
      setConversations([]);
      setAdminUnreadCount(0);
      setChatMetrics(null);
    }
  }, [activeTab, showChatMetrics]);

  // Cargar bandeja unificada cuando se activa la tab
  useEffect(() => {
    if (activeTab === 'unified-inbox') {
      // Los datos ya se cargan en los efectos de 'messages' y 'tickets'
      // Solo necesitamos unificar cuando cambian los datos
    }
  }, [activeTab]);

  // Unificar mensajes cuando cambian las fuentes
  useEffect(() => {
    if (activeTab === 'unified-inbox' || activeTab === 'messages' || activeTab === 'tickets') {
      const unified = getUnifiedInbox(conversations, tickets, contactMessages);
      setUnifiedMessages(unified);
    }
  }, [conversations, tickets, contactMessages, activeTab]);

  // Cargar anuncios cuando se cambia a la tab de anuncios
  useEffect(() => {
    if (activeTab === 'announcements') {
      const unsubscribe = getAllAnnouncements((announcements) => {
        setAnnouncements(announcements);
      });
      return () => unsubscribe();
    } else {
      setAnnouncements([]);
    }
  }, [activeTab]);

  // Cargar métricas de anuncios
  useEffect(() => {
    if (activeTab === 'announcements' && showAnnouncementMetrics) {
      const unsubscribe = getAllAnnouncementsMetrics((metrics) => {
        setAnnouncementMetrics(metrics);
      });
      return () => unsubscribe();
    } else {
      setAnnouncementMetrics([]);
    }
  }, [activeTab, showAnnouncementMetrics]);

  // Función para eliminar anuncio
  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('¿Estás seguro de que querés eliminar este anuncio?')) {
      return;
    }
    try {
      await deleteAnnouncement(announcementId);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      alert('✅ Anuncio eliminado');
    } catch (error) {
      console.error('Error eliminando anuncio:', error);
      alert('❌ Error al eliminar anuncio');
    }
  };

  // Cargar tickets y mensajes de contacto
  useEffect(() => {
    if (activeTab === 'tickets' || activeTab === 'unified-inbox') {
      const unsubscribeTickets = getAllTickets((tickets) => {
        setTickets(tickets);
      });
      
      const unsubscribeMessages = getAllContactMessages((messages) => {
        setContactMessages(messages);
      });
      
      return () => {
        unsubscribeTickets();
        unsubscribeMessages();
      };
    } else if (activeTab !== 'messages') {
      // Solo limpiar si no estamos en messages (messages también necesita estos datos para unified-inbox)
      setSelectedTicket(null);
    }
  }, [activeTab]);
  
  // Cargar mensajes de conversación seleccionada en tiempo real
  useEffect(() => {
    let unsubscribeMessages: (() => void) | null = null;
    
    if (selectedConversation) {
      // Escuchar mensajes en tiempo real
      unsubscribeMessages = getMessages(selectedConversation, (messages) => {
        setConversationMessages(messages);
        // Marcar como leídos cuando se cargan
        markMessagesAsRead(selectedConversation, 'admin');
        
        // Auto-scroll al final cuando hay nuevos mensajes
        setTimeout(() => {
          const container = document.getElementById('admin-messages-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      });
    } else if (selectedUserForMessage) {
      // Si hay usuario seleccionado para mensaje nuevo, cargar sus mensajes
      const convId = `admin_${selectedUserForMessage}`;
      unsubscribeMessages = getMessages(convId, (messages) => {
        setConversationMessages(messages);
        
        // Auto-scroll al final
        setTimeout(() => {
          const container = document.getElementById('admin-messages-container');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }, 100);
      });
      setSelectedConversation(convId);
    } else {
      setConversationMessages([]);
    }
    
    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [selectedConversation, selectedUserForMessage]);
  
  // Auto-scroll cuando se envía un mensaje
  useEffect(() => {
    if (conversationMessages.length > 0) {
      setTimeout(() => {
        const container = document.getElementById('admin-messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [conversationMessages.length]);

  // Escuchar estado de conversación seleccionada
  useEffect(() => {
    if (!selectedConversation || !user) return;

    const unsubscribe = watchConversationStatus(selectedConversation, (status) => {
      setConversationStatus(status || 'open');
    });

    return () => unsubscribe();
  }, [selectedConversation, user]);

  // Funciones para gestionar conversaciones
  const handleCloseConversation = async () => {
    if (!selectedConversation || !user || closingConversation) return;

    if (!confirm('¿Estás seguro de cerrar esta conversación? El usuario no podrá responder hasta que la reabras.')) {
      return;
    }

    setClosingConversation(true);
    try {
      await closeConversation(selectedConversation, user.id);
      setConversationStatus('closed');
    } catch (error) {
      console.error('Error cerrando conversación:', error);
      alert('Error al cerrar la conversación');
    } finally {
      setClosingConversation(false);
    }
  };

  const handleReopenConversation = async () => {
    if (!selectedConversation || !user || closingConversation) return;

    setClosingConversation(true);
    try {
      await reopenConversation(selectedConversation, user.id);
      setConversationStatus('open');
    } catch (error) {
      console.error('Error reabriendo conversación:', error);
      alert('Error al reabrir la conversación');
    } finally {
      setClosingConversation(false);
    }
  };

  // ============================================
  // FUNCIONES PARA CREAR SUBASTA
  // ============================================
  
  // Función para validar el formulario de subasta
  const validateAuctionForm = (form: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validar título
    if (!form.title || form.title.trim().length < 5) {
      errors.push('El título debe tener al menos 5 caracteres');
    }
    if (form.title && form.title.length > 100) {
      errors.push('El título no puede superar los 100 caracteres');
    }

    // Validar descripción
    if (!form.description || form.description.trim().length < 20) {
      errors.push('La descripción debe tener al menos 20 caracteres');
    }
    if (form.description && form.description.length > 2000) {
      errors.push('La descripción no puede superar los 2000 caracteres');
    }

    // Validar precio inicial
if (!form.startingPrice || form.startingPrice <= 0) {  // ← CAMBIADO
  errors.push('El precio inicial debe ser mayor a $0');
}
if (form.startingPrice && form.startingPrice < 100) {  // ← CAMBIADO
  errors.push('El precio inicial mínimo es $100');
}

// Validar precio de Compra Ya (si está activado)
if (form.buyNowPrice && form.buyNowPrice > 0) {
  if (form.buyNowPrice <= form.startingPrice) {  // ← CAMBIADO
    errors.push('El precio de "Compra Ya" debe ser mayor al precio inicial');
  }
}

    // Validar imágenes
    if (!form.images || form.images.length === 0) {
      errors.push('Debes agregar al menos 1 imagen');
    }
    if (form.images && form.images.length > 3) {
      errors.push('Máximo 3 imágenes permitidas');
    }

    // Validar duración
    const totalMinutes = (form.durationDays * 24 * 60) + (form.durationHours * 60) + form.durationMinutes;
    if (totalMinutes < 5) {
      errors.push('La duración mínima es de 5 minutos');
    }
    if (totalMinutes > 10080) { // 7 días
      errors.push('La duración máxima es de 7 días');
    }

    // Validar fecha programada (si está activada)
    if (form.scheduled) {
      if (!form.scheduledDate || !form.scheduledTime) {
        errors.push('Debes seleccionar fecha y hora para programar la subasta');
      } else {
        const scheduledDateTime = new Date(`${form.scheduledDate}T${form.scheduledTime}`);
        if (scheduledDateTime <= new Date()) {
          errors.push('La fecha programada debe ser futura');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // Función para crear subasta en Firebase
  const handleCreateAuction = async () => {
    // Validar formulario
    const validation = validateAuctionForm(auctionForm);
    if (!validation.valid) {
      alert(`Errores en el formulario:\n\n${validation.errors.join('\n')}`);
      return;
    }

    if (!user || !user.id) {
      alert('Debes estar autenticado para crear subastas.');
      return;
    }
    try {
      // Calcular fecha de finalización
      const now = new Date();
      let startTime = now;

      // Si está programada, usar la fecha programada
      if (auctionForm.scheduled && auctionForm.scheduledDate && auctionForm.scheduledTime) {
        startTime = new Date(`${auctionForm.scheduledDate}T${auctionForm.scheduledTime}`);
      }

      // Calcular end time basado en duración
      const totalMinutes = (auctionForm.durationDays * 24 * 60) + (auctionForm.durationHours * 60) + auctionForm.durationMinutes;
      const endTime = new Date(startTime.getTime() + totalMinutes * 60000);

      // Sanitizar precio inicial, quitar ceros a izquierda
const sanitizedstartPriceStr = String(auctionForm.startingPrice ?? '').replace(/^0+/, '');  // ← CAMBIADO
if (!sanitizedstartPriceStr || isNaN(Number(sanitizedstartPriceStr)) || Number(sanitizedstartPriceStr) < 100) {
  alert('El precio inicial debe ser un número mayor o igual a $100 (sin ceros a la izquierda).');
  return;
}
const sanitizedstartPrice = Number(sanitizedstartPriceStr);

      // Verificar formato de otros campos claves
      if (!auctionForm.title || !auctionForm.description || !auctionForm.images?.length) {
        alert('Todos los campos requeridos deben estar completos y válidos.');
        return;
      }

      // Crear objeto de subasta
const newAuction: Auction = {
  id: `auction_${Date.now()}`,
  title: auctionForm.title.trim(),
  description: auctionForm.description.trim(),
        images: auctionForm.images,
        stickers: auctionForm.stickers || [],
        startingPrice: sanitizedstartPrice,  // ← CAMBIAR a startingPrice
        currentPrice: sanitizedstartPrice,
        buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
  startTime: new Date(),  // ← AGREGAR startTime (requerido)
  endTime: endTime,
  status: auctionForm.scheduled ? 'scheduled' as any : 'active',
  categoryId: auctionForm.categoryId,
  bids: [],
  featured: auctionForm.featured || false,
  isFlash: totalMinutes <= 60, // Si dura 1 hora o menos, es flash
  condition: auctionForm.condition || 'new',
  createdBy: user.id,
  createdAt: new Date()  // ← AGREGAR createdAt
};

      // Guardar en Firebase usando la función del store
      try {
        console.log('🔥 Guardando subasta en Firebase...');
        await addAuction(newAuction);
        console.log('✅ Subasta guardada en Firebase correctamente');
      } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        
        if (error instanceof Error) {
          alert('Error guardando en Firebase: ' + error.message);
        } else {
          alert('Error guardando en Firebase: Error desconocido');
        }
        return; // Salir si falla el guardado
      }
      logAuctionAction('Subasta creada', newAuction.id, user?.id, user?.username, { title: auctionForm.title });

      // Mensaje de éxito
      const successMessage = auctionForm.scheduled 
        ? `✅ Subasta programada correctamente para ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString()}`
        : '✅ Subasta creada correctamente';
      
      alert(successMessage);

      // Resetear formulario
setAuctionForm({
  title: '',
  description: '',
  startingPrice: 1000,     // ← CAMBIADO
  currentPrice: 1000,
  buyNowPrice: 0,
  categoryId: '1',
  images: [] as string[],
  stickers: [] as string[],
  durationDays: 0,
  durationHours: 0,
  durationMinutes: 30,
  condition: 'new' as 'new' | 'like-new' | 'excellent' | 'good' | 'fair',
  featured: false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});

      // Volver a la lista de subastas
      setActiveTab('auctions');

    } catch (error: any) {
      console.error('❌ Error creando subasta:', error);
      alert(`❌ Error al crear subasta: ${error.message}`);
    }
  };
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  // Estados para productos
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
  name: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '1',
  images: [] as string[],
  badges: [] as string[],
  stickers: [] as string[],
  active: true,
  featured: false
});

  // Estados para subastas
const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
const [auctionForm, setAuctionForm] = useState({
  title: '',
  description: '',
  startingPrice: 0,  // ← CAMBIADO de startPrice a startingPrice
  currentPrice: 0,
  buyNowPrice: 0,
  categoryId: '1',
  images: [] as string[],
  stickers: [] as string[],
  durationDays: 0,
  durationHours: 0,
  durationMinutes: 30,
  condition: 'new' as 'new' | 'like-new' | 'excellent' | 'good' | 'fair',
  featured: false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});

  // Estados para bots
  const [botForm, setBotForm] = useState({
    name: '',
    balance: 10000,
    intervalMin: 5,
    intervalMax: 15,
    maxBidAmount: 5000,
    targetAuctions: [] as string[]
  });
  const [showBotForm, setShowBotForm] = useState(false);

  // Estados para inventario
  const [inventoryFilter, setInventoryFilter] = useState('all');

  // Estados para pedidos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all' | 'active' | 'inactive'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderTransactions, setOrderTransactions] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set()); // Para selección masiva
  
  // ============================================
  // FUNCIONES PARA ESTADÍSTICAS DEL DASHBOARD
  // ============================================
  
  const getDashboardStats = () => {
    // Usuarios
    const totalUsers = realUsers.length;
    const activeUsers = realUsers.filter((u: { active: boolean; }) => u.active !== false).length;
    
    // Subastas
    const activeAuctions = auctions.filter((a: { status: string; }) => a.status === 'active').length;
    const endedAuctions = auctions.filter((a: { status: string; }) => a.status === 'ended').length;
    const totalBids = auctions.reduce((sum: any, a: { bids: string | any[]; }) => sum + (a.bids?.length || 0), 0);
    
    // Productos
    const totalProducts = products.length;
    const activeProducts = products.filter((p: Product) => p.active !== false && p.active !== undefined).length;
    const lowStockProducts = products.filter((p: { stock: number; }) => p.stock > 0 && p.stock < 5).length;
    const outOfStockProducts = products.filter((p: { stock: number; }) => p.stock === 0).length;
    
    // Pedidos
    const totalOrders = orders.length;
    const pendingPayment = orders.filter((o: { status: string; }) => o.status === 'pending_payment').length;
    const processing = orders.filter((o: { status: string; }) => o.status === 'processing').length;
    const inTransit = orders.filter((o: { status: string; }) => o.status === 'in_transit').length;
    const delivered = orders.filter((o: { status: string; }) => o.status === 'delivered').length;
    
    // Ingresos
    const totalRevenue = orders
      .filter((o: { status: string; }) => ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status))
      .reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0);
    
    const monthRevenue = orders
      .filter((o: { createdAt: string | number | Date; status: string; }) => {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear() &&
               ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status);
      })
      .reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0);
    
    // Bots - Eliminar duplicados antes de calcular
    const uniqueBots = Array.from(
      new Map(bots.map(bot => [bot.id, bot])).values()
    );
    const activeBots = uniqueBots.filter((b: { isActive: any; }) => b.isActive);
    const totalBotsBalance = uniqueBots.reduce((sum: any, b: { balance: any; }) => sum + (b.balance || 0), 0);
    
    // Tickets
    const totalTickets = tickets.length;
    const pendingTickets = tickets.filter((t: Ticket) => t.status === 'visto').length;
    const inReviewTickets = tickets.filter((t: Ticket) => t.status === 'revision').length;
    const resolvedTickets = tickets.filter((t: Ticket) => t.status === 'resuelto').length;
    
    // Mensajes de contacto
    const totalContactMessages = contactMessages.length;
    const unreadContactMessages = contactMessages.filter((m: ContactMessage) => !m.read).length;
    
    return {
      users: { total: totalUsers, active: activeUsers },
      auctions: { active: activeAuctions, ended: endedAuctions, totalBids },
      products: { total: totalProducts, active: activeProducts, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
      orders: { total: totalOrders, pendingPayment, processing, inTransit, delivered },
      revenue: { total: totalRevenue, month: monthRevenue },
      bots: { active: activeBots.length, total: uniqueBots.length, totalBalance: totalBotsBalance },
      tickets: { total: totalTickets, pending: pendingTickets, inReview: inReviewTickets, resolved: resolvedTickets },
      contactMessages: { total: totalContactMessages, unread: unreadContactMessages }
    };
  };
  
  const getRecentActivity = () => {
    // Usar el timestamp desde el estado (que viene de Firebase)
    const clearedTime = clearedActivityTimestamp || 0;
    const activities: any[] = [];
    const seenOrderIds = new Set<string>(); // Para evitar duplicados de órdenes
    
    // Eliminar duplicados de órdenes primero (por ID)
    const uniqueOrders = orders.filter((order: Order, index: number, self: Order[]) => 
      index === self.findIndex((o: Order) => o.id === order.id)
    );
    
    // Últimas 5 órdenes (sin duplicados)
    const recentOrders = [...uniqueOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentOrders.forEach(order => {
      const orderTime = new Date(order.createdAt).getTime();
      // Filtrar órdenes automáticas de subastas finalizadas (no son acciones del usuario)
      // Solo mostrar órdenes manuales de la tienda (type: 'store')
      if (orderTime > clearedTime && !seenOrderIds.has(order.id) && order.type === 'store') {
        seenOrderIds.add(order.id);
        activities.push({
          id: order.id, // ID único para identificar duplicados
          type: 'order',
          message: `${order.userName} realizó un pedido de ${formatCurrency(order.amount)}`,
          time: order.createdAt,
          status: order.status
        });
      }
    });
    
    // Últimas 5 pujas
    const seenBidKeys = new Set<string>(); // Para evitar duplicados de pujas
    const recentBids = auctions
      .flatMap((a: { bids: any[]; title: any; }) => a.bids?.map((b: any) => ({ ...b, auctionTitle: a.title })) || [])
      .sort((a: { createdAt: string | number | Date; }, b: { createdAt: string | number | Date; }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    
    recentBids.forEach((bid: { username: any; amount: number; auctionTitle: any; createdAt: any; id?: string }) => {
      const bidTime = new Date(bid.createdAt).getTime();
      // Crear una clave única para la puja
      const bidKey = bid.id || `${bid.username}-${bid.amount}-${bid.auctionTitle}-${bidTime}`;
      if (bidTime > clearedTime && !seenBidKeys.has(bidKey)) {
        seenBidKeys.add(bidKey);
        activities.push({
          id: bid.id || bidKey,
          type: 'bid',
          message: `${bid.username} pujó ${formatCurrency(bid.amount)} en "${bid.auctionTitle}"`,
          time: bid.createdAt,
          status: 'bid'
        });
      }
    });
    
    // Eliminar duplicados finales por ID (por si acaso)
    const uniqueActivities = activities.filter((activity, index, self) => 
      index === self.findIndex((a) => a.id === activity.id)
    );
    
    return uniqueActivities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);
  };
  
  // Memoizar la actividad reciente para evitar recalcularla múltiples veces
  const recentActivity = useMemo(() => getRecentActivity(), [orders, auctions, refreshKey, clearedActivityTimestamp]);
  
  const getAuctionsEndingSoon = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return auctions.filter((a: { endTime: string | number | Date; status: string; }) => {
      const endTime = new Date(a.endTime);
      return a.status === 'active' && endTime > now && endTime <= tomorrow;
    });
  };

  const stats = getDashboardStats();

  // Variables calculadas para filtros del inventario
  const lowStockProducts = products.filter((p: { stock: number; }) => p.stock > 0 && p.stock < 5);
  const outOfStockProducts = products.filter((p: { stock: number; }) => p.stock === 0);
  const totalInventoryValue = products.reduce((sum: number, p: { price: number; stock: number; }) => sum + (p.price * p.stock), 0);

  // Cargar usuarios reales de Firebase
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map((doc: { id: any; data: () => any; }) => ({
        id: doc.id,
        ...doc.data()
      }));
      setRealUsers(usersData);
      console.log('✅ Usuarios cargados:', usersData.length);
    } catch (error) {
      console.error('❌ Error al cargar usuarios:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    // Cargar usuarios cuando se abre la pestaña de usuarios o mensajes
    if (activeTab === 'users' || activeTab === 'messages') {
      loadUsers();
    }
  }, [activeTab]);

  // Funciones para Productos
  const handleEditProduct = (product: Product) => {
  setEditingProduct(product);
  setProductForm({
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    categoryId: product.categoryId,
    images: product.images || [],
    badges: product.badges || [],
    stickers: product.stickers || [],
    active: product.active !== undefined ? product.active : true,
    featured: product.featured === true
  });
  setActiveTab('edit-product');
};
  const handleCreateProduct = () => {
  // Resetear formulario
  setProductForm({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    categoryId: '1',
    images: [] as string[],
    badges: [] as string[],
    stickers: [] as string[], // Agregar stickers inicializado
    active: true,
    featured: false
  });
  setEditingProduct(null);
  setActiveTab('create-product');
};
  const validateProductForm = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validar nombre
  if (!productForm.name || productForm.name.trim().length < 5) {
    errors.push('El nombre debe tener al menos 5 caracteres');
  }
  if (productForm.name && productForm.name.length > 100) {
    errors.push('El nombre no puede superar los 100 caracteres');
  }

  // Validar descripción
  if (!productForm.description || productForm.description.trim().length < 20) {
    errors.push('La descripción debe tener al menos 20 caracteres');
  }
  if (productForm.description && productForm.description.length > 2000) {
    errors.push('La descripción no puede superar los 2000 caracteres');
  }

  // Validar precio
  if (!productForm.price || productForm.price < 100) {
    errors.push('El precio mínimo es $100');
  }

  // Validar stock
  if (productForm.stock < 0) {
    errors.push('El stock no puede ser negativo');
  }

  // Validar imágenes
  if (productForm.images.length === 0) {
    errors.push('Debes agregar al menos 1 imagen del producto');
  }
  if (productForm.images.length > 5) {
    errors.push('Máximo 5 imágenes por producto');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

  const handleSaveProduct = async () => {
  // Validar formulario
  const validation = validateProductForm();
  if (!validation.valid) {
    alert(`❌ Errores en el formulario:\n\n${validation.errors.join('\n')}`);
    return;
  }

  if (!user || !user.id) {
    alert('Debes estar autenticado para crear/editar productos.');
    return;
  }

  try {
    if (editingProduct) {
      // EDITAR PRODUCTO EXISTENTE
      const updatedProduct: Product = {
        ...editingProduct,
        name: productForm.name,
        description: productForm.description,
        price: productForm.price,
        stock: productForm.stock,
        categoryId: productForm.categoryId,
        images: productForm.images || [],
        badges: productForm.badges || [],
        stickers: productForm.stickers || [],
        active: productForm.active,
        featured: productForm.featured,
        updatedAt: new Date().toISOString()
      };

      // Guardar en Firebase PRIMERO (requerido)
      try {
        console.log('🔥 Guardando producto actualizado en Firebase...');
        await update(dbRef(realtimeDb, `products/${updatedProduct.id}`), updatedProduct);
        console.log('✅ Producto actualizado en Firebase correctamente');
        
        // Solo actualizar estado local después de que Firebase confirme
        // Firebase sincronizará automáticamente a todos los dispositivos
        const updatedProducts: Product[] = products.map((p: Product) =>
          p.id === editingProduct.id ? updatedProduct : p
        );
        setProducts(updatedProducts, true); // skipFirebaseSync = true porque ya se guardó
      } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        if (error instanceof Error) {
          alert('❌ Error guardando en Firebase: ' + error.message + '\n\nLos cambios NO se guardaron. Verifica las reglas de Firebase Realtime Database.');
        } else {
          alert('❌ Error guardando en Firebase: Error desconocido\n\nLos cambios NO se guardaron.');
        }
        return; // No continuar si falla Firebase
      }
      logProductAction('Producto actualizado', editingProduct.id, user?.id, user?.username, { name: productForm.name });
      alert('✅ Producto actualizado correctamente');
      setEditingProduct(null);
      setActiveTab('products');

    } else {
      // CREAR PRODUCTO NUEVO
      const newProduct: Product = {
        ...productForm,
        id: `product_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ratings: [],
        averageRating: 0,
        stickers: productForm.stickers || []
      };

      // Guardar en Firebase PRIMERO (requerido)
      try {
        console.log('🔥 Guardando producto nuevo en Firebase...');
        await update(dbRef(realtimeDb, `products/${newProduct.id}`), newProduct);
        console.log('✅ Producto guardado en Firebase correctamente');
        
        // Solo actualizar estado local después de que Firebase confirme
        // Firebase sincronizará automáticamente a todos los dispositivos
        setProducts([...products, newProduct], true); // skipFirebaseSync = true porque ya se guardó
      } catch (error) {
        console.error('❌ Error guardando en Firebase:', error);
        if (error instanceof Error) {
          alert('❌ Error guardando en Firebase: ' + error.message + '\n\nEl producto NO se guardó. Verifica las reglas de Firebase Realtime Database.');
        } else {
          alert('❌ Error guardando en Firebase: Error desconocido\n\nEl producto NO se guardó.');
        }
        return; // No continuar si falla Firebase
      }
      logProductAction('Producto creado', newProduct.id, user?.id, user?.username, { name: productForm.name });
      alert('✅ Producto creado correctamente y disponible para todos los usuarios');
      
      // Resetear formulario
      setProductForm({
        name: '',
        description: '',
        price: 0,
        stock: 0,
        categoryId: '1',
        images: [] as string[],
        badges: [] as string[],
        stickers: [] as string[],
        active: true,
        featured: false
      });

      setActiveTab('products');
    }
  } catch (error: any) {
    console.error('❌ Error guardando producto:', error);
    alert(`❌ Error al guardar producto: ${error.message}`);
  }
};

  const handleDeleteProduct = async (productId: string) => {
    const product = products.find((p: { id: string; }) => p.id === productId);
    if (window.confirm(`¿Estás seguro de eliminar "${product?.name}"?\n\nEsta acción no se puede deshacer.`)) {
      // Eliminar de Firebase PRIMERO (requerido)
      try {
        console.log('🗑️ Eliminando producto de Firebase...');
        await remove(dbRef(realtimeDb, `products/${productId}`));
        console.log('✅ Producto eliminado de Firebase correctamente');
        
        // Solo eliminar del estado local después de que Firebase confirme
        // Firebase sincronizará automáticamente a todos los dispositivos
        const updatedProducts = products.filter((p: Product) => p.id !== productId);
        setProducts(updatedProducts, true); // skipFirebaseSync = true porque ya se eliminó
        logProductAction('Producto eliminado', productId, user?.id, user?.username, { name: product?.name || '' });
        alert('🗑️ Producto eliminado correctamente');
      } catch (error: any) {
        console.error('❌ Error eliminando producto:', error);
        if (error instanceof Error) {
          alert('❌ Error eliminando de Firebase: ' + error.message + '\n\nEl producto NO se eliminó. Verifica las reglas de Firebase Realtime Database.');
        } else {
          alert('❌ Error eliminando de Firebase: Error desconocido\n\nEl producto NO se eliminó.');
        }
        // No continuar si falla Firebase
      }
    }
  };

  const handleEditAuction = (auction: Auction) => {
    setEditingAuction(auction);
    
    // Calcular duración restante desde el endTime
    const now = new Date();
    const endTime = new Date(auction.endTime);
    const remainingMs = endTime.getTime() - now.getTime();
    const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
    
    const durationDays = Math.floor(remainingMinutes / (24 * 60));
    const durationHours = Math.floor((remainingMinutes % (24 * 60)) / 60);
    const durationMinutes = remainingMinutes % 60;
    
      setAuctionForm({
  title: auction.title,
  description: auction.description,
  startingPrice: auction.startingPrice,  // ← CAMBIADO
  currentPrice: auction.currentPrice,
  buyNowPrice: auction.buyNowPrice || 0,
  categoryId: auction.categoryId,
  images: auction.images || [],
  stickers: auction.stickers || [],
  durationDays: durationDays > 0 ? durationDays : 0,
  durationHours: durationHours > 0 ? durationHours : 0,
  durationMinutes: durationMinutes > 0 ? durationMinutes : 30,
  condition: auction.condition || 'new',
  featured: auction.featured || false,
  allowExtension: true,
  scheduled: false,
  scheduledDate: '',
  scheduledTime: ''
});
    setActiveTab('edit-auction');
  };

  const handleSaveAuction = async () => {
    if (!editingAuction) return;

    // Validar formulario (reutilizamos la misma validación de crear)
    const validation = validateAuctionForm(auctionForm);
    if (!validation.valid) {
      alert(`Errores en el formulario:\n\n${validation.errors.join('\n')}`);
      return;
    }

    // Advertencia si se modifica precio inicial y ya hay ofertas
if (editingAuction.bids.length > 0 && auctionForm.startingPrice !== editingAuction.startingPrice) {  // ← CAMBIADO
  if (!window.confirm('⚠️ ADVERTENCIA: Esta subasta ya tiene ofertas.\n\n¿Estás seguro de cambiar el precio inicial?\n\nEsto puede afectar la validez de las ofertas existentes.')) {
    return;
  }
}

    // Calcular nueva fecha de finalización basada en duración
    const totalMinutes = (auctionForm.durationDays * 24 * 60) + (auctionForm.durationHours * 60) + auctionForm.durationMinutes;
    const now = new Date();
    const newEndTime = new Date(now.getTime() + totalMinutes * 60000);

    // Actualizar subasta
    const updatedAuctions: Auction[] = auctions.map((a: Auction) => {
      if (a.id === editingAuction.id) {
        return {
          ...a,
          title: auctionForm.title.trim(),
          description: auctionForm.description.trim(),
          startingPrice: Number(auctionForm.startingPrice),
          currentPrice: Math.max(Number(auctionForm.currentPrice), Number(auctionForm.startingPrice)),
          buyNowPrice: auctionForm.buyNowPrice > 0 ? Number(auctionForm.buyNowPrice) : undefined,
          categoryId: auctionForm.categoryId,
          images: auctionForm.images,
          stickers: auctionForm.stickers || [],
          condition: auctionForm.condition,
          featured: auctionForm.featured,
          endTime: newEndTime,
          isFlash: totalMinutes <= 60
        };
      }
      return a;
    });
    
    // Guardar cambios en Firebase
    try {
      const auctionToUpdate = updatedAuctions.find(a => a.id === editingAuction.id);
      if (auctionToUpdate) {
        await updateAuction(editingAuction.id, {
          title: auctionToUpdate.title,
          description: auctionToUpdate.description,
          startingPrice: auctionToUpdate.startingPrice,
          currentPrice: auctionToUpdate.currentPrice,
          buyNowPrice: auctionToUpdate.buyNowPrice,
          categoryId: auctionToUpdate.categoryId,
          images: auctionToUpdate.images,
          stickers: auctionToUpdate.stickers,
          condition: auctionToUpdate.condition,
          featured: auctionToUpdate.featured,
          endTime: auctionToUpdate.endTime,
          isFlash: auctionToUpdate.isFlash
        });
      }
      setAuctions(updatedAuctions);
      alert('✅ Subasta actualizada correctamente');
    } catch (error) {
      console.error('❌ Error actualizando subasta:', error);
      alert('❌ Error al actualizar la subasta. Por favor intenta nuevamente.');
    }
    
    setEditingAuction(null);
    setActiveTab('auctions');
  };
  const handleDeleteAuction = async (auctionId: string) => {
    const auction = auctions.find((a: { id: string; }) => a.id === auctionId);
    if (window.confirm(`¿Estás seguro de eliminar "${auction?.title}"?\n\nSe perderán todas las ofertas asociadas.`)) {
      try {
        await deleteAuction(auctionId);
        alert('🗑️ Subasta eliminada correctamente');
      } catch (error) {
        console.error('❌ Error eliminando subasta:', error);
        alert('❌ Error al eliminar la subasta. Por favor intenta nuevamente.');
      }
    }
  };

  // Función para abrir modal de republicar
  const handleRepublishAuction = (auction: Auction) => {
    setRepublishModal({ show: true, auction });
  };

  // Función para editar antes de republicar
  const handleRepublishWithEdit = () => {
    if (republishModal.auction) {
      handleEditAuction(republishModal.auction);
      setRepublishModal({ show: false, auction: null });
    }
  };

  // Función para republicar sin cambios
  const handleRepublishWithoutChanges = async () => {
    if (!republishModal.auction) return;
    
    const auction = republishModal.auction;
    // Republicar tal como está - preservar todas las propiedades importantes
    const now = new Date();
    const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días desde ahora
    
    const republishedAuction: Auction = {
      ...auction,
      id: `auction_${Date.now()}`, // Nuevo ID
      status: 'active',
      startTime: now,
      endTime: endTime,
      bids: [], // Limpiar ofertas
      winnerId: undefined,
      currentPrice: auction.startingPrice,
      createdAt: now,
      // Preservar explícitamente propiedades importantes
      featured: auction.featured || false,
      isFlash: auction.isFlash || false,
      stickers: auction.stickers || [],
      images: auction.images || [],
      description: auction.description,
      categoryId: auction.categoryId,
      condition: auction.condition || 'new'
    };

    // Guardar en Firebase usando la función del store
    try {
      await addAuction(republishedAuction);
      logAuctionAction('Subasta republicada', republishedAuction.id, user?.id, user?.username, { title: auction.title });
      alert('✅ Subasta republicada correctamente');
    } catch (error) {
      console.error('❌ Error republicando subasta:', error);
      alert('❌ Error al republicar la subasta. Por favor intenta nuevamente.');
    }
    
    setRepublishModal({ show: false, auction: null });
  };

  // Función para cancelar republicar
  const handleCancelRepublish = () => {
    setRepublishModal({ show: false, auction: null });
  };

  // Funciones para Bots
  const handleAddBot = async () => {
    if (!botForm.name || !botForm.name.trim()) {
      alert('⚠️ Por favor ingresa un nombre para el bot');
      return;
    }
    if (botForm.balance < 100) {
      alert('⚠️ El balance debe ser al menos $100');
      return;
    }
    if (botForm.maxBidAmount < 100) {
      alert('⚠️ La oferta máxima debe ser al menos $100');
      return;
    }
    if (botForm.intervalMin >= botForm.intervalMax) {
      alert('⚠️ El intervalo mínimo debe ser menor que el máximo');
      return;
    }
    if (botForm.intervalMin < 1 || botForm.intervalMax > 300) {
      alert('⚠️ Los intervalos deben estar entre 1 y 300 segundos');
      return;
    }
    
    try {
      const newBot = {
        id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: botForm.name.trim(),
        balance: Number(botForm.balance),
        intervalMin: Number(botForm.intervalMin),
        intervalMax: Number(botForm.intervalMax),
        maxBidAmount: Number(botForm.maxBidAmount),
        isActive: true,
        targetAuctions: botForm.targetAuctions || []
      };
      
      await addBot(newBot);
      logAdminAction(`Bot creado: ${newBot.name}`, user?.id, user?.username);
      
      setBotForm({
        name: '',
        balance: 10000,
        intervalMin: 5,
        intervalMax: 15,
        maxBidAmount: 5000,
        targetAuctions: []
      });
      
      alert(`✅ Bot "${newBot.name}" creado correctamente`);
    } catch (error) {
      // Error silencioso - funcionalidad oculta del admin
      alert('❌ Error al crear el bot. Por favor intenta nuevamente.');
    }
  };

  // Función de Reset mejorada - preserva usuarios y logs de ventas
  const handleResetData = async () => {
    if (!window.confirm('⚠️ ADVERTENCIA CRÍTICA:\n\nEsto BORRARÁ PERMANENTEMENTE todos los datos excepto usuarios registrados.\n\n¿Estás 100% seguro de continuar?')) {
      return;
    }
    
    if (!window.confirm('⚠️ ÚLTIMA CONFIRMACIÓN:\n\nSe ELIMINARÁN de Firebase:\n❌ Subastas\n❌ Productos\n❌ Bots\n❌ Notificaciones\n❌ Mensajes\n❌ Pedidos\n❌ Transacciones de pedidos\n❌ Imágenes (subastas, productos, banners)\n\nSe PRESERVARÁN:\n✅ Usuarios registrados\n✅ Configuración de admin\n\n¿Proceder con el borrado completo?')) {
      return;
    }

    try {
      console.log('🔥 Iniciando borrado completo de Firebase...');
      const errors: string[] = [];
      
      // 🔥 ELIMINAR TODO DE FIREBASE REALTIME DATABASE
      try {
        // PRIMERO: Limpiar estado y desconectar listeners de notificaciones
        console.log('🧹 Limpiando estado de notificaciones y desconectando listeners...');
        clearNotifications();
        
        // Eliminar subastas
        const auctionsRef = dbRef(realtimeDb, 'auctions');
        await remove(auctionsRef);
        console.log('✅ Todas las subastas eliminadas de Firebase');
        
        // Eliminar productos
        const productsRef = dbRef(realtimeDb, 'products');
        await remove(productsRef);
        console.log('✅ Todos los productos eliminados de Firebase');
        
        // Eliminar bots
        const botsRef = dbRef(realtimeDb, 'bots');
        await remove(botsRef);
        // Log silencioso - funcionalidad oculta del admin
        
        // Eliminar notificaciones de todos los usuarios
        // Primero verificar si existen notificaciones y eliminarlas por usuario también
        const notificationsRef = dbRef(realtimeDb, 'notifications');
        const notificationsSnapshot = await get(notificationsRef);
        
        if (notificationsSnapshot.exists()) {
          const notificationsData = notificationsSnapshot.val();
          // Eliminar notificaciones por cada usuario para asegurar eliminación completa
          if (notificationsData && typeof notificationsData === 'object') {
            const deletePromises = Object.keys(notificationsData).map(userId => {
              const userNotificationsRef = dbRef(realtimeDb, `notifications/${userId}`);
              return remove(userNotificationsRef).catch(err => {
                console.warn(`⚠️ Error eliminando notificaciones de usuario ${userId}:`, err);
                return null;
              });
            });
            await Promise.all(deletePromises);
            console.log(`✅ Notificaciones eliminadas de ${Object.keys(notificationsData).length} usuarios`);
          }
        }
        
        // Eliminar también la raíz por si acaso
        await remove(notificationsRef);
        console.log('✅ Todas las notificaciones eliminadas de Firebase (raíz y por usuario)');
        
        // Esperar un momento para asegurar que Firebase procese la eliminación
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Eliminar mensajes de todas las conversaciones
        const messagesRef = dbRef(realtimeDb, 'messages');
        await remove(messagesRef);
        console.log('✅ Todos los mensajes eliminados de Firebase');
        
        // Eliminar pedidos
        const ordersRef = dbRef(realtimeDb, 'orders');
        await remove(ordersRef);
        console.log('✅ Todos los pedidos eliminados de Firebase');
        
        // Eliminar transacciones de pedidos
        const orderTransactionsRef = dbRef(realtimeDb, 'orderTransactions');
        await remove(orderTransactionsRef);
        console.log('✅ Todas las transacciones de pedidos eliminadas de Firebase');
        
        const orderTransactionsByOrderRef = dbRef(realtimeDb, 'orderTransactionsByOrder');
        await remove(orderTransactionsByOrderRef);
        console.log('✅ Todas las transacciones por pedido eliminadas de Firebase');
        
        // Eliminar secuencias de pedidos (para reiniciar el contador)
        const orderSequencesRef = dbRef(realtimeDb, 'orderSequences');
        await remove(orderSequencesRef);
        console.log('✅ Secuencias de pedidos eliminadas de Firebase');
        
      } catch (firebaseError: any) {
        console.error('❌ Error eliminando datos de Realtime Database:', firebaseError);
        errors.push(`Realtime Database: ${firebaseError.message || 'Error desconocido'}`);
      }
      
      // 🔥 ELIMINAR IMÁGENES DE FIREBASE STORAGE
      try {
        const foldersToDelete = ['auctions', 'products', 'images', 'banners'];
        
        for (const folder of foldersToDelete) {
          try {
            const folderRef = storageRef(storage, folder);
            const listResult = await listAll(folderRef);
            
            // Eliminar todos los archivos en la carpeta
            const deletePromises = listResult.items.map(item => 
              deleteObject(item).catch(err => {
                console.warn(`⚠️ No se pudo eliminar ${item.fullPath}:`, err.message);
                return null;
              })
            );
            
            await Promise.all(deletePromises);
            console.log(`✅ Todas las imágenes de ${folder} eliminadas de Firebase Storage`);
          } catch (folderError: any) {
            // Si la carpeta no existe, no es un error
            if (folderError.code !== 'storage/object-not-found') {
              console.warn(`⚠️ Error eliminando carpeta ${folder}:`, folderError.message);
              errors.push(`Storage ${folder}: ${folderError.message}`);
            }
          }
        }
      } catch (storageError: any) {
        console.error('❌ Error eliminando imágenes de Storage:', storageError);
        errors.push(`Firebase Storage: ${storageError.message || 'Error desconocido'}`);
      }
      
      // Limpiar todo de localStorage (ya no se usa, pero por si acaso)
      localStorage.removeItem('auctions');
      localStorage.removeItem('products');
      localStorage.removeItem('bots');
      localStorage.removeItem('notifications');
      localStorage.removeItem('cart');
      localStorage.removeItem('orders');
      
      // Limpiar estado de la app (las notificaciones ya se limpiaron arriba con clearNotifications)
      setAuctions([]);
      setProducts([]);
      setBots([]);
      setOrders([]);
      
      // Registrar acción en log
      logAdminAction('Sistema reseteado completamente (solo usuarios preservados)', user?.id, user?.username);
      
      // Marcar en localStorage que se acaba de hacer un reset (para evitar cargar notificaciones inmediatamente)
      localStorage.setItem('_systemResetTimestamp', Date.now().toString());
      
      // Mostrar resultado
      if (errors.length > 0) {
        alert(`⚠️ Reset completado con algunos errores:\n\n${errors.join('\n')}\n\n✅ Usuarios registrados preservados\n\nRevisa la consola para más detalles.`);
      } else {
        alert('✅ Sistema reseteado completamente.\n\n✅ Usuarios registrados preservados\n✅ Todos los demás datos eliminados de Firebase\n\nLa página se recargará en 3 segundos...');
      }
      
      // Recargar para aplicar cambios SIN perder sesión (aumentado a 3 segundos para dar tiempo a Firebase)
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('Error en reset:', error);
      alert('❌ Error crítico al resetear datos. Revisa la consola para más detalles.');
    }
  };

  // Cargar transacciones cuando se selecciona un pedido
  useEffect(() => {
    if (selectedOrder) {
      // Solo cargar transacciones si el usuario es admin
      if (user?.isAdmin) {
        try {
          const unsubscribe = loadOrderTransactions(selectedOrder.id, (transactions) => {
            setOrderTransactions(transactions);
          });
          return () => unsubscribe();
        } catch (error: any) {
          // Silenciar errores de permisos (esperados si no hay acceso)
          if (error?.code !== 'PERMISSION_DENIED' && !error?.message?.includes('permission_denied')) {
            console.error('Error cargando transacciones del pedido:', error);
          }
          setOrderTransactions([]);
        }
      } else {
        setOrderTransactions([]);
      }
    } else {
      setOrderTransactions([]);
    }
  }, [selectedOrder, user?.isAdmin]);

  // Filtrar pedidos y eliminar duplicados
  const uniqueOrders = orders.filter((order: Order, index: number, self: Order[]) => 
    index === self.findIndex((o: Order) => o.id === order.id)
  );
  
  const filteredOrders = uniqueOrders.filter((order: Order) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         order.id.toLowerCase().includes(searchLower) ||
                         (order.orderNumber && order.orderNumber.toLowerCase().includes(searchLower)) ||
                         order.userId.toLowerCase().includes(searchLower) ||
                         (order.userName && order.userName.toLowerCase().includes(searchLower)) ||
                         (order.productName && order.productName.toLowerCase().includes(searchLower)) ||
                         formatCurrency(order.amount).toLowerCase().includes(searchLower);
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  }).sort((a: Order, b: Order) => {
    // Ordenar por fecha más reciente primero
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const getStatusBadge = (status: OrderStatus) => {
  const badges = {
    pending_payment: { className: 'badge-warning', text: '⏳ Pago Pendiente' },
    payment_expired: { className: 'badge-error', text: '❌ Expirado' },
    payment_confirmed: { className: 'badge-success', text: '✅ Pago Confirmado' },
    processing: { className: 'badge-info', text: '🔄 Procesando' },
    preparing: { className: 'badge-info', text: '📦 Preparando' },
    shipped: { className: 'badge-primary', text: '🚢 Enviado' },
    in_transit: { className: 'badge-primary', text: '🚚 En Tránsito' },
    delivered: { className: 'badge-success', text: '✅ Entregado' },
    cancelled: { className: 'badge-secondary', text: '🚫 Cancelado' },
    expired: { className: 'badge-error', text: '⌛ Expirado' }
  };
  return badges[status] || { className: 'badge-secondary', text: '❓ Desconocido' };
};

  const getDeliveryMethodBadge = (method: string) => {
    const badges = {
      'shipping': { icon: '📦', text: 'Envío' },
      'pickup': { icon: '🏪', text: 'Retiro en Sucursal' },
      'email': { icon: '📧', text: 'Email/Digital' }
    };
    return badges[method as keyof typeof badges] || { icon: '📦', text: method };
  };

  const getTotalStats = () => {
    const stats = {
      pending: orders.filter((o: { status: string; }) => o.status === 'pending_payment').length,
      processing: orders.filter((o: { status: string; }) => o.status === 'processing').length,
      shipped: orders.filter((o: { status: string; }) => o.status === 'shipped').length,
      delivered: orders.filter((o: { status: string; }) => o.status === 'delivered').length,
      revenue: orders.filter((o: { status: string; }) => o.status === 'delivered').reduce((sum: any, o: { amount: any; }) => sum + o.amount, 0)
    };
    return stats;
  };

  // Helper para filtrar subastas con ganador (evita problemas de tipo)
  const getAuctionsWithWinner = (auctionsList: Auction[]): Auction[] => {
    return auctionsList.filter((a: Auction) => Boolean(a.winnerId));
  };

  // Estadísticas mejoradas: ingresos por subastas y tienda, más buscado, más cliqueado
  const getEnhancedStats = () => {
    // Ingresos por subastas (ventas ganadas)
    const auctionsWithWinner = getAuctionsWithWinner(auctions);
    const auctionRevenue = auctionsWithWinner.reduce((sum: number, a: Auction) => sum + (a.currentPrice || 0), 0);

    // Ingresos por tienda (pedidos entregados)
    const storeRevenue = orders
      .filter((o: { status: string; }) => o.status === 'delivered')
      .reduce((sum: number, o: { amount: number }) => sum + (o.amount || 0), 0);

    // Egresos (gastos) - por ahora 0, pero se puede expandir
    const expenses = 0;

    // Más buscado usando tracking system
    const mostSearched = trackingSystem.getMostSearched(10);

    // Más cliqueado usando tracking system
    const mostClicked = trackingSystem.getMostClicked(10);

    // Estadísticas de tracking
    const trackingStats = trackingSystem.getStats();

    // Logs recientes de acciones
    const recentLogs = actionLogger.getLogs().slice(0, 20);

    return {
      auctionRevenue,
      storeRevenue,
      expenses,
      totalRevenue: auctionRevenue + storeRevenue,
      netProfit: auctionRevenue + storeRevenue - expenses,
      mostSearched,
      mostClicked,
      trackingStats,
      recentLogs
    };
  };

  // Calcular estadísticas (después de definir las funciones)
  const enhancedStats = getEnhancedStats();
  const orderStats = getTotalStats();

  // Debug: verificar que las estadísticas se calculan
  useEffect(() => {
    if (activeTab === 'dashboard') {
      console.log('🎯 Dashboard activo - Estadísticas calculadas:', {
        auctionRevenue: enhancedStats.auctionRevenue,
        storeRevenue: enhancedStats.storeRevenue,
        netProfit: enhancedStats.netProfit,
        mostSearched: enhancedStats.mostSearched.length,
        mostClicked: enhancedStats.mostClicked.length
      });
    }
  }, [activeTab, enhancedStats]);

  // Función helper para crear notificación para otro usuario
  const createNotificationForUser = async (targetUserId: string, notification: {
    type: 'new_message' | 'auction_won' | 'auction_outbid' | 'purchase' | 'payment_reminder';
    title: string;
    message: string;
    link?: string;
  }) => {
    try {
      const newNotification = {
        ...notification,
        userId: targetUserId,
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        read: false
      };
      
      // Guardar directamente en Firebase para el usuario receptor
      const notificationRef = dbRef(realtimeDb, `notifications/${targetUserId}/${newNotification.id}`);
      await firebaseSet(notificationRef, newNotification);
      
      console.log(`✅ Notificación creada para usuario ${targetUserId}: ${newNotification.id}`);
    } catch (error) {
      console.error('❌ Error creando notificación para usuario:', error);
    }
  };

  // Función para enviar mensaje
  const handleSendMessage = async () => {
    if (!newMessageContent.trim() || conversationStatus === 'closed') return;
    
    try {
      let userId: string;
      
      if (selectedUserForMessage) {
        // Nuevo mensaje a usuario seleccionado
        userId = selectedUserForMessage;
        const message = createMessage('admin', 'Administrador', userId, newMessageContent.trim());
        await saveMessage(message);
        
        // Crear notificación para el usuario receptor
        await createNotificationForUser(userId, {
          type: 'new_message',
          title: '💬 Nuevo mensaje del administrador',
          message: `Tienes un nuevo mensaje: ${newMessageContent.trim().substring(0, 50)}${newMessageContent.trim().length > 50 ? '...' : ''}`,
          link: '/perfil?tab=messages'
        });
        
        // Seleccionar la conversación si no está seleccionada
        const convId = `admin_${userId}`;
        if (!selectedConversation) {
          setSelectedConversation(convId);
        }
        setSelectedUserForMessage(null);
        setShowUserSelector(false);
      } else if (selectedConversation) {
        // Responder a conversación existente
        userId = selectedConversation.replace('admin_', '');
        const message = createMessage('admin', 'Administrador', userId, newMessageContent.trim());
        await saveMessage(message);
        
        // Crear notificación para el usuario receptor
        await createNotificationForUser(userId, {
          type: 'new_message',
          title: '💬 Nuevo mensaje del administrador',
          message: `Tienes un nuevo mensaje: ${newMessageContent.trim().substring(0, 50)}${newMessageContent.trim().length > 50 ? '...' : ''}`,
          link: '/perfil?tab=messages'
        });
      } else {
        console.warn('No hay conversación o usuario seleccionado');
        return;
      }
      
      setNewMessageContent('');
      // El mensaje aparecerá automáticamente gracias al listener en tiempo real
      console.log('✅ Mensaje enviado correctamente');
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      alert('❌ Error al enviar el mensaje. Por favor, intentá nuevamente.');
    }
  };

  // Función para eliminar propiedades undefined recursivamente (Firebase no las acepta)
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item)).filter(item => item !== null && item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = removeUndefined(value);
          }
        }
      }
      return cleaned;
    }
    return obj;
  };

  // Función para guardar configuración de home
  const handleSaveHomeConfig = async () => {
    try {
      const updatedConfig = { 
        ...homeConfig, 
        updatedAt: new Date().toISOString(),
        siteSettings: {
          ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings),
          logoConfig: homeConfig.siteSettings?.logoConfig || undefined,
          logoStickers: (homeConfig.siteSettings?.logoStickers || []).map(s => {
            const cleaned: any = { ...s };
            // Solo incluir startDate y endDate si tienen valores
            // startDate y endDate son strings en LogoSticker, no Date
            // Pero pueden venir como Date desde Firebase, así que los convertimos a string si es necesario
            if (s.startDate) {
              const startDateValue = s.startDate as any;
              cleaned.startDate = typeof startDateValue === 'string' 
                ? startDateValue 
                : (startDateValue instanceof Date ? startDateValue.toISOString() : String(startDateValue));
            }
            if (s.endDate) {
              const endDateValue = s.endDate as any;
              cleaned.endDate = typeof endDateValue === 'string' 
                ? endDateValue 
                : (endDateValue instanceof Date ? endDateValue.toISOString() : String(endDateValue));
            }
            // Eliminar propiedades undefined explícitamente
            if (!s.startDate) delete cleaned.startDate;
            if (!s.endDate) delete cleaned.endDate;
            return cleaned;
          })
        },
        themeColors: homeConfig.themeColors || defaultHomeConfig.themeColors,
        themeColorSets: homeConfig.themeColorSets || defaultHomeConfig.themeColorSets,
        sectionTitles: homeConfig.sectionTitles || defaultHomeConfig.sectionTitles,
        banners: homeConfig.banners.map(b => {
          const cleaned: any = { ...b };
          if (b.createdAt) {
            cleaned.createdAt = b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt;
          }
          if (b.updatedAt) {
            cleaned.updatedAt = b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt;
          }
          return cleaned;
        }),
        promotions: homeConfig.promotions.map(p => {
          const cleaned: any = { ...p };
          if (p.createdAt) {
            cleaned.createdAt = p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt;
          }
          if (p.startDate) {
            cleaned.startDate = p.startDate instanceof Date ? p.startDate.toISOString() : p.startDate;
          }
          if (p.endDate) {
            cleaned.endDate = p.endDate instanceof Date ? p.endDate.toISOString() : p.endDate;
          }
          // Eliminar propiedades undefined explícitamente
          if (!p.startDate) delete cleaned.startDate;
          if (!p.endDate) delete cleaned.endDate;
          return cleaned;
        }),
        aboutSection: homeConfig.aboutSection || defaultHomeConfig.aboutSection,
        contactSection: homeConfig.contactSection || defaultHomeConfig.contactSection
      };
      
      // Eliminar todas las propiedades undefined antes de guardar en Firebase
      const cleanedConfig = removeUndefined(updatedConfig);
      
      // Guardar en Firebase
      const homeConfigRef = dbRef(realtimeDb, 'homeConfig');
      await firebaseSet(homeConfigRef, cleanedConfig);
      
      // No actualizar estado local manualmente - el listener de Firebase lo hará automáticamente
      // Esto asegura que los tipos sean correctos (Date vs string)
      await logAdminAction('Configuración de home guardada', user?.id, user?.username);
      alert('✅ Configuración del inicio guardada correctamente en Firebase');
    } catch (error) {
      console.error('❌ Error guardando configuración de home en Firebase:', error);
      alert('❌ Error al guardar la configuración. Por favor, intenta nuevamente.');
    }
  };

  // Funciones para gestión de banners
  const handleAddBanner = () => {
    const newBanner = {
      id: `banner-${Date.now()}`,
      title: 'Nuevo Banner',
      description: '',
      imageUrl: '',
      link: '',
      linkText: 'Ver más',
      active: true,
      order: homeConfig.banners.length,
      createdAt: new Date()
    };
    setHomeConfig({
      ...homeConfig,
      banners: [...homeConfig.banners, newBanner]
    });
  };

  const handleUpdateBanner = (bannerId: string, updates: any) => {
    setHomeConfig({
      ...homeConfig,
      banners: homeConfig.banners.map(b => 
        b.id === bannerId ? { ...b, ...updates, updatedAt: new Date() } : b
      )
    });
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (window.confirm('¿Eliminar este banner?')) {
      setHomeConfig({
        ...homeConfig,
        banners: homeConfig.banners.filter(b => b.id !== bannerId)
      });
    }
  };

  // Funciones para gestión de promociones
  const handleAddPromotion = () => {
    const newPromotion = {
      id: `promo-${Date.now()}`,
      title: 'Nueva Promoción',
      description: '',
      imageUrl: '',
      link: '',
      active: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días desde hoy
      order: homeConfig.promotions.length,
      createdAt: new Date()
    };
    setHomeConfig({
      ...homeConfig,
      promotions: [...homeConfig.promotions, newPromotion]
    });
  };

  const handleUpdatePromotion = (promoId: string, updates: any) => {
    setHomeConfig({
      ...homeConfig,
      promotions: homeConfig.promotions.map(p => 
        p.id === promoId ? { ...p, ...updates } : p
      )
    });
  };

  const handleDeletePromotion = (promoId: string) => {
    if (window.confirm('¿Eliminar esta promoción?')) {
      setHomeConfig({
        ...homeConfig,
        promotions: homeConfig.promotions.filter(p => p.id !== promoId)
      });
    }
  };

  // Funciones para manejo de imágenes (drag & drop y file input)
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Error al convertir archivo a base64'));
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>, setImageUrl: (url: string) => void, uploadToStorage: boolean = false, folder: string = 'images', allowVideo: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    // Validar que sea una imagen o video (si está permitido)
    const isImage = file.type.startsWith('image/');
    const isVideo = allowVideo && file.type.startsWith('video/');
    const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
    
    if (!isImage && !isVideo && !isGif) {
      alert('⚠️ Solo se permiten archivos de imagen, GIF animado o video');
      return;
    }

    // Validar tamaño (máximo 5MB para imágenes, 10MB para videos)
    const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? 10 : 5;
      alert(`⚠️ El archivo no puede superar los ${maxSizeMB}MB`);
      return;
    }

    try {
      if (uploadToStorage) {
        // Subir a Firebase Storage
        console.log(`📤 Subiendo imagen a Firebase Storage en carpeta: ${folder}`);
        const url = await uploadImage(file, folder);
        console.log(`✅ Imagen subida exitosamente: ${url}`);
        setImageUrl(url);
      } else {
        // Convertir a base64 (para banners, promociones, etc.)
        const base64 = await convertFileToBase64(file);
        setImageUrl(base64);
      }
    } catch (error: any) {
      console.error('Error procesando imagen:', error);
      alert(`❌ Error al procesar la imagen: ${error.message || 'Error desconocido'}`);
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, setImageUrl: (url: string) => void, uploadToStorage: boolean = false, folder: string = 'images', allowVideo: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea una imagen, GIF animado o video (si está permitido)
    const isImage = file.type.startsWith('image/');
    const isVideo = allowVideo && file.type.startsWith('video/');
    const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
    
    if (!isImage && !isVideo && !isGif) {
      alert('⚠️ Solo se permiten archivos de imagen, GIF animado o video');
      e.target.value = '';
      return;
    }

    // Validar tamaño (máximo 5MB para imágenes, 10MB para videos)
    const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = isVideo ? 10 : 5;
      alert(`⚠️ El archivo no puede superar los ${maxSizeMB}MB`);
      e.target.value = '';
      return;
    }

    try {
      if (uploadToStorage) {
        // Subir a Firebase Storage
        console.log(`📤 Subiendo imagen a Firebase Storage en carpeta: ${folder}`);
        const url = await uploadImage(file, folder);
        console.log(`✅ Imagen subida exitosamente: ${url}`);
        setImageUrl(url);
      } else {
        // Convertir a base64 (para banners, promociones, etc.)
        const base64 = await convertFileToBase64(file);
        setImageUrl(base64);
      }
      e.target.value = '';
    } catch (error: any) {
      console.error('Error procesando imagen:', error);
      alert(`❌ Error al procesar la imagen: ${error.message || 'Error desconocido'}`);
      e.target.value = '';
    }
  };

  // Funciones para templates de mensajes
  const handleSaveTemplate = (templateId: string, template: Partial<MessageTemplate>) => {
    if (updateMessageTemplate(templateId, template)) {
      const updated = loadMessageTemplates();
      setMessageTemplates(updated);
      logAdminAction(`Template de mensaje actualizado: ${template.title || templateId}`, user?.id, user?.username);
      alert('✅ Template guardado correctamente');
    } else {
      alert('❌ Error al guardar el template');
    }
  };

  const handlePreviewTemplate = (template: MessageTemplate) => {
    // Variables de ejemplo para el preview
    const exampleVars: Record<string, string | number> = {
      username: 'Ejemplo Usuario',
      auctionTitle: 'Subasta de Ejemplo',
      productName: 'Producto de Ejemplo',
      amount: 50000,
      orderId: 'ORD-12345678',
      auctionId: 'AUC-123456',
      paymentDeadline: '48 horas',
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR'),
      trackingNumber: 'TRACK-123456789',
      currentBid: 45000,
      minBid: 46000
    };
    const preview = renderTemplate(template, exampleVars);
    setTemplatePreview(preview);
  };

  // Recargar templates cuando cambia el tab
  useEffect(() => {
    if (activeTab === 'settings') {
      setMessageTemplates(loadMessageTemplates());
    }
  }, [activeTab]);

  // Función para limpieza manual de datos antiguos
  const handleManualCleanup = async () => {
    if (!user) return;
    
    if (!window.confirm('¿Limpiar datos antiguos ahora?\n\nEsto eliminará:\n- Notificaciones leídas de más de 1 día\n- Notificaciones no leídas de más de 2 días\n- Subastas finalizadas de más de 3 días\n- Pedidos completados de más de 7 días')) {
      return;
    }

    try {
      // Obtener todas las notificaciones del usuario desde Firebase
      const { notifications } = useStore.getState();
      const now = Date.now();
      const readCutoffDate = now - (1 * 24 * 60 * 60 * 1000); // 1 día para leídas
      const unreadCutoffDate = now - (2 * 24 * 60 * 60 * 1000); // 2 días para no leídas
      
      let notificationsDeleted = 0;
      
      // Eliminar notificaciones antiguas de Firebase
      for (const notification of notifications) {
        let shouldDelete = false;
        const createdAt = notification.createdAt ? new Date(notification.createdAt).getTime() : 0;
        const readAt = notification.readAt ? new Date(notification.readAt).getTime() : 0;
        
        if (notification.read && readAt > 0) {
          // Notificación leída: eliminar si fue leída hace más de 1 día
          if (readAt < readCutoffDate) {
            shouldDelete = true;
          }
        } else if (!notification.read && createdAt > 0) {
          // Notificación no leída: eliminar si fue creada hace más de 2 días
          if (createdAt < unreadCutoffDate) {
            shouldDelete = true;
          }
        }
        
        if (shouldDelete) {
          try {
            const notificationRef = dbRef(realtimeDb, `notifications/${user.id}/${notification.id}`);
            await remove(notificationRef);
            notificationsDeleted++;
            console.log(`🗑️ Notificación ${notification.id} eliminada de Firebase`);
          } catch (error) {
            console.error(`❌ Error eliminando notificación ${notification.id} de Firebase:`, error);
          }
        }
      }
      
      const result = runCleanup(user.id, auctions, orders);
      
      if (result) {
        // Actualizar subastas y pedidos si se limpiaron
        if (result.auctionsCleanup.cleaned > 0) {
          const cleanedAuctions = auctions.filter((auction: any) => {
            if (auction.status === 'active' || auction.status === 'scheduled') return true;
            if (auction.status === 'ended') {
              const now = Date.now();
              const cutoffDate = now - (3 * 24 * 60 * 60 * 1000);
              const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
              const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
              const checkDate = endTime > 0 ? endTime : createdAt;
              return checkDate >= cutoffDate;
            }
            return true;
          });
          
          // Eliminar subastas de Firebase
          const auctionsToRemove = auctions.filter((auction: any) => {
            if (auction.status === 'active' || auction.status === 'scheduled') return false;
            if (auction.status === 'ended') {
              const now = Date.now();
              const cutoffDate = now - (3 * 24 * 60 * 60 * 1000);
              const endTime = auction.endTime ? new Date(auction.endTime).getTime() : 0;
              const createdAt = auction.createdAt ? new Date(auction.createdAt).getTime() : 0;
              const checkDate = endTime > 0 ? endTime : createdAt;
              return checkDate < cutoffDate;
            }
            return false;
          });
          
          for (const auction of auctionsToRemove) {
            try {
              await remove(dbRef(realtimeDb, `auctions/${auction.id}`));
              console.log(`🗑️ Subasta ${auction.id} eliminada de Firebase`);
            } catch (error) {
              console.error(`❌ Error eliminando subasta ${auction.id} de Firebase:`, error);
            }
          }
          
          setAuctions(cleanedAuctions);
        }
        
        if (result.ordersCleanup.cleaned > 0) {
          const cleanedOrders = orders.filter((order: any) => {
            if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) return true;
            if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
              const now = Date.now();
              const cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
              const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
              return orderDate >= cutoffDate;
            }
            return true;
          });
          
          // Eliminar pedidos de Firebase
          const ordersToRemove = orders.filter((order: any) => {
            if (['pending_payment', 'payment_confirmed', 'in_transit'].includes(order.status)) return false;
            if (['delivered', 'canceled', 'payment_expired'].includes(order.status)) {
              const now = Date.now();
              const cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
              const orderDate = order.createdAt ? new Date(order.createdAt).getTime() : 0;
              return orderDate < cutoffDate;
            }
            return false;
          });
          
          for (const order of ordersToRemove) {
            try {
              await remove(dbRef(realtimeDb, `orders/${order.id}`));
              console.log(`🗑️ Pedido ${order.id} eliminado de Firebase`);
            } catch (error) {
              console.error(`❌ Error eliminando pedido ${order.id} de Firebase:`, error);
            }
          }
          
          setOrders(cleanedOrders);
        }

        // Recargar notificaciones
        const { loadUserNotifications } = useStore.getState();
        if (loadUserNotifications) {
          setTimeout(() => {
            loadUserNotifications();
          }, 500);
        }

        const total = notificationsDeleted + result.auctionsCleanup.cleaned + result.ordersCleanup.cleaned;
        alert(`✅ Limpieza completada:\n- ${notificationsDeleted} notificaciones eliminadas de Firebase\n- ${result.auctionsCleanup.cleaned} subastas eliminadas de Firebase\n- ${result.ordersCleanup.cleaned} pedidos eliminados de Firebase\n\nTotal: ${total} elementos eliminados`);
        logAdminAction('Limpieza manual de datos ejecutada', user.id, user.username, { total, notificationsDeleted });
      }
    } catch (error) {
      console.error('Error en limpieza manual:', error);
      alert('❌ Error al ejecutar limpieza');
    }
  };

  // Calcular contadores para bandeja unificada
  const unifiedUnreadCounts = getUnreadCountsByType(unifiedMessages);
  const totalUnreadUnified = unifiedUnreadCounts.total;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'auctions', label: 'Subastas', icon: Gavel },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'bots', label: 'Bots', icon: Bot },
    { id: 'unified-inbox', label: 'Bandeja Unificada', icon: Mail, badge: totalUnreadUnified > 0 ? totalUnreadUnified : undefined },
    { id: 'messages', label: 'Mensajes', icon: MessageSquare, badge: adminUnreadCount > 0 ? adminUnreadCount : undefined },
    { id: 'tickets', label: 'Tickets', icon: TicketIcon, badge: tickets.filter(t => t.status !== 'resuelto').length > 0 ? tickets.filter(t => t.status !== 'resuelto').length : undefined },
    { id: 'announcements', label: 'Anuncios', icon: Bell },
    { id: 'home-config', label: 'Editor Home', icon: ImageIcon },
    { id: 'settings', label: 'Configuración', icon: Activity }
  ];

  // Tabs para navegación móvil inferior (todas las secciones)
  const mainMobileTabs = tabs;

  // Protección de acceso - DEBE IR DESPUÉS DE TODOS LOS HOOKS
  if (!user?.isAdmin) {
    return (
      <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '3rem', borderRadius: '1.5rem', maxWidth: '500px' }}>
          <AlertCircle size={64} color="var(--error)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Solo los administradores pueden acceder a este panel de control.
          </p>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary">
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'admin-panel-mobile' : ''} style={{ 
      minHeight: 'calc(100vh - 80px)', 
      background: 'var(--bg-primary)', 
      padding: isMobile ? '0' : '2rem',
      paddingTop: isMobile ? '0' : '1rem'
    }}>
      {/* Header */}
      <div className={isMobile ? 'admin-header-mobile' : ''} style={{ 
        marginBottom: isMobile ? '1rem' : '2rem',
        padding: isMobile ? '1rem' : '0'
      }}>
        <h1 style={{ 
          fontSize: isMobile ? '1.5rem' : '2rem', 
          fontWeight: 700, 
          marginBottom: '0.5rem', 
          color: 'var(--text-primary)' 
        }}>
          Panel de Administración
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: isMobile ? '0.875rem' : '1rem' 
        }}>
          Gestioná subastas, productos, usuarios y más
        </p>
      </div>

      {/* Tabs Navigation - Solo visible en desktop */}
      {!isMobile && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid var(--border)',
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch'
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                <Icon size={18} />
                {tab.label}
                {tab.badge && (
                  <span style={{
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginLeft: '0.25rem'
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className={isMobile ? 'admin-main-content-mobile' : ''} style={{
        padding: isMobile ? '1rem' : '0'
      }}>
      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Stats Cards */}
          <div className={isMobile ? 'mobile-data-grid' : ''} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <StatsCard
              title="Usuarios Totales"
              value={stats.users.total}
              icon={Users}
              color="var(--primary)"
              subtitle={`${stats.users.active} activos`}
            />
            <StatsCard
              title="Subastas Activas"
              value={stats.auctions.active}
              icon={Gavel}
              color="var(--success)"
              subtitle={`${stats.auctions.ended} finalizadas`}
            />
            <StatsCard
              title="Productos"
              value={stats.products.total}
              icon={Package}
              color="var(--warning)"
              subtitle={`${stats.products.active} activos`}
            />
            <StatsCard
              title="Pedidos Totales"
              value={stats.orders.total}
              icon={ShoppingCart}
              color="var(--info)"
              subtitle={`${orderStats.delivered} entregados`}
            />
            <StatsCard
              title="Ingresos Totales"
              value={formatCurrency(enhancedStats.totalRevenue)}
              icon={DollarSign}
              color="var(--success)"
              subtitle={`${formatCurrency(stats.revenue.month)} este mes`}
            />
            <StatsCard
              title="Bots Activos"
              value={stats.bots.active}
              icon={Bot}
              color="var(--secondary)"
              subtitle={`${stats.bots.totalBalance.toLocaleString()} balance total`}
            />
            <StatsCard
              title="Tickets"
              value={stats.tickets.total}
              icon={TicketIcon}
              color="var(--warning)"
              subtitle={`${stats.tickets.pending} pendientes, ${stats.tickets.resolved} resueltos`}
            />
            <StatsCard
              title="Mensajes de Contacto"
              value={stats.contactMessages.total}
              icon={Mail}
              color="var(--info)"
              subtitle={`${stats.contactMessages.unread} no leídos`}
            />
          </div>

          {/* Alertas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {lowStockProducts.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--warning)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('products')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <AlertTriangle size={32} color="var(--warning)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Productos con Stock Bajo
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {lowStockProducts.length} productos con stock menor a 5 unidades
                    </p>
                  </div>
                </div>
              </div>
            )}

            {outOfStockProducts.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--error)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('products')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <XCircle size={32} color="var(--error)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Productos Sin Stock
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {outOfStockProducts.length} productos sin stock disponible
                    </p>
                  </div>
                </div>
              </div>
            )}

            {getAuctionsEndingSoon().length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--warning)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('auctions')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Clock size={32} color="var(--warning)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Subastas Finalizando
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {getAuctionsEndingSoon().length} subastas finalizan en las próximas 24 horas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {orderStats.pending > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--info)',
                cursor: 'pointer'
              }} onClick={() => setActiveTab('orders')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ShoppingCart size={32} color="var(--info)" />
                  <div>
                    <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                      Pedidos Pendientes
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                      {orderStats.pending} pedidos esperando pago
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Estadísticas Financieras Detalladas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), #d65a00)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Store size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ingresos por Subastas</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.auctionRevenue)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                {getAuctionsWithWinner(auctions).length} subastas vendidas
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--success), #10b981)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <ShoppingBag size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ingresos por Tienda</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.storeRevenue)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                {orders.filter((o: { status: string; }) => o.status === 'delivered').length} pedidos entregados
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, var(--info), #0891b2)',
              padding: '1.5rem',
              borderRadius: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <TrendingUp size={24} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Ganancia Neta</h3>
              </div>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>
                {formatCurrency(enhancedStats.netProfit)}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                Total: {formatCurrency(enhancedStats.totalRevenue)}
              </p>
            </div>
          </div>

          {/* Más Buscado y Más Cliqueado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Search size={20} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Más Buscado
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {enhancedStats.mostSearched.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Aún no hay búsquedas registradas
                  </p>
                ) : (
                  enhancedStats.mostSearched.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '0.5rem'
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          "{item.query}"
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.avgResults} resultados promedio
                        </p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {item.count}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <MousePointerClick size={20} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Más Cliqueado
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {enhancedStats.mostClicked.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                    Aún no hay clicks registrados
                  </p>
                ) : (
                  enhancedStats.mostClicked.slice(0, 5).map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '0.5rem'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.875rem', 
                          fontWeight: 500, 
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.name}
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.type === 'product' ? 'Producto' : 'Subasta'}
                        </p>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: item.type === 'product' ? 'var(--warning)' : 'var(--primary)',
                        color: 'white',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginLeft: '0.5rem'
                      }}>
                        {item.clicks}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actividad Reciente con Botón de Limpiar */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                Actividad Reciente
              </h2>
              {recentActivity.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de que querés limpiar la actividad reciente?\n\nEsto eliminará permanentemente:\n- Órdenes completadas/canceladas antiguas\n- Pujas de subastas finalizadas\n\nLas órdenes activas y subastas en curso NO se eliminarán.')) {
                      (async () => {
                        const now = Date.now();
                        const clearedTimestamp = now.toString();
                        
                        try {
                          // Guardar timestamp en Firebase para persistencia
                          if (user?.id) {
                            try {
                              await firebaseSet(dbRef(realtimeDb, `adminSettings/${user.id}/clearedActivityTimestamp`), clearedTimestamp);
                            } catch (firebaseError: any) {
                              // Si falla por permisos, solo usar localStorage
                              if (firebaseError?.code === 'PERMISSION_DENIED') {
                                console.log('ℹ️ No hay permisos para guardar en adminSettings, usando localStorage');
                              } else {
                                console.error('Error guardando timestamp en Firebase:', firebaseError);
                              }
                            }
                            // También guardar en localStorage para compatibilidad
                            localStorage.setItem(`clearedActivityTimestamp_${user.id}`, clearedTimestamp);
                          }
                        // También guardar en clave global para compatibilidad
                        localStorage.setItem('clearedActivityTimestamp', clearedTimestamp);
                        
                        // Eliminar órdenes antiguas completadas/canceladas (más de 7 días)
                        const cutoffDate = now - (7 * 24 * 60 * 60 * 1000); // 7 días
                        const activeOrderStatuses = ['pending_payment', 'payment_confirmed', 'processing', 'preparing', 'in_transit', 'shipped'];
                        
                        const filteredOrders = orders.filter(order => {
                          // Mantener órdenes activas siempre
                          if (activeOrderStatuses.includes(order.status)) {
                            return true;
                          }
                          // Mantener órdenes recientes (menos de 7 días)
                          const orderDate = new Date(order.createdAt).getTime();
                          if (orderDate >= cutoffDate) {
                            return true;
                          }
                          // Eliminar órdenes antiguas completadas/canceladas
                          return false;
                        });
                        
                        // Eliminar órdenes de Firebase
                        const ordersToRemove = orders.filter(order => {
                          if (activeOrderStatuses.includes(order.status)) {
                            return false; // No eliminar activas
                          }
                          const orderDate = new Date(order.createdAt).getTime();
                          return orderDate < cutoffDate; // Eliminar si es antigua
                        });
                        
                        for (const order of ordersToRemove) {
                          try {
                            await remove(dbRef(realtimeDb, `orders/${order.id}`));
                            console.log(`🗑️ Orden ${order.id} eliminada de Firebase`);
                          } catch (error) {
                            console.error(`❌ Error eliminando orden ${order.id} de Firebase:`, error);
                          }
                        }
                        
                        if (filteredOrders.length < orders.length) {
                          setOrders(filteredOrders);
                          console.log(`🗑️ Eliminadas ${orders.length - filteredOrders.length} órdenes antiguas de Firebase`);
                        }
                        
                        // Limpiar pujas de subastas finalizadas antiguas (más de 7 días)
                        const updatedAuctions = auctions.map(auction => {
                          if (auction.status === 'ended') {
                            const endTime = new Date(auction.endTime).getTime();
                            const daysSinceEnd = (now - endTime) / (24 * 60 * 60 * 1000);
                            
                            // Si la subasta finalizó hace más de 7 días, limpiar pujas antiguas
                            if (daysSinceEnd > 7 && auction.bids.length > 0) {
                              // Mantener solo la puja ganadora si existe
                              const winningBid = auction.bids.reduce((highest, current) => 
                                current.amount > highest.amount ? current : highest
                              );
                              
                              return {
                                ...auction,
                                bids: [winningBid]
                              };
                            }
                          }
                          return auction;
                        });
                        
                        // Actualizar subastas en Firebase
                        for (const auction of updatedAuctions) {
                          if (auction.status === 'ended') {
                            const endTime = new Date(auction.endTime).getTime();
                            const daysSinceEnd = (now - endTime) / (24 * 60 * 60 * 1000);
                            if (daysSinceEnd > 7 && auction.bids.length > 0) {
                              try {
                                await update(dbRef(realtimeDb, `auctions/${auction.id}`), {
                                  bids: auction.bids
                                });
                                console.log(`✅ Subasta ${auction.id} actualizada en Firebase (pujas limpiadas)`);
                              } catch (error) {
                                console.error(`❌ Error actualizando subasta ${auction.id} en Firebase:`, error);
                              }
                            }
                          }
                        }
                        
                        setAuctions(updatedAuctions);
                        setRefreshKey(prev => prev + 1);
                        logAdminAction('Actividad reciente limpiada permanentemente', user?.id, user?.username);
                        
                          alert(`✅ Actividad reciente limpiada\n\nEliminadas ${orders.length - filteredOrders.length} órdenes antiguas de Firebase.`);
                        } catch (error) {
                          console.error('❌ Error limpiando actividad reciente:', error);
                          alert('❌ Error al limpiar actividad reciente. Algunos datos pueden no haberse eliminado correctamente.');
                        }
                      })();
                    }
                  }}
                  className="btn"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCw size={16} />
                  Limpiar
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentActivity.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No hay actividad reciente
                </p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} style={{
                    padding: '1rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {activity.message}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {formatTimeAgo(activity.time)}
                      </p>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '0.25rem',
                      background: activity.type === 'order' ? 'var(--info)' : 'var(--primary)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {activity.type === 'order' ? 'Pedido' : 'Puja'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subastas Tab */}
      {activeTab === 'auctions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Gestión de Subastas</h2>
            <button
              onClick={() => {
                setAuctionForm({
                  title: '',
                  description: '',
                  startingPrice: 1000,
                  currentPrice: 1000,
                  buyNowPrice: 0,
                  categoryId: '1',
                  images: [],
                  stickers: [],
                  durationDays: 0,
                  durationHours: 0,
                  durationMinutes: 30,
                  condition: 'new',
                  featured: false,
                  allowExtension: true,
                  scheduled: false,
                  scheduledDate: '',
                  scheduledTime: ''
                });
                setEditingAuction(null);
                setActiveTab('create-auction');
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={20} />
              Nueva Subasta
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {auctions.map((auction: Auction) => (
              <div key={auction.id} style={{
                background: 'var(--bg-secondary)',
                padding: '1.5rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  {auction.images && auction.images.length > 0 && (
                    <img
                      src={auction.images[0]}
                      alt={auction.title}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}
                    />
                  )}
                  <h3 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                    {auction.title}
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Precio actual: {formatCurrency(auction.currentPrice)}
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Estado: <span style={{
                      color: auction.status === 'active' ? 'var(--success)' : 'var(--text-secondary)',
                      fontWeight: 600
                    }}>
                      {auction.status === 'active' ? 'Activa' : auction.status === 'ended' ? 'Finalizada' : 'Programada'}
                    </span>
                  </p>
                  <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Ofertas: {auction.bids?.length || 0}
                  </p>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  flexWrap: isMobile ? 'wrap' : 'nowrap',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => handleEditAuction(auction)}
                    className="btn btn-secondary"
                    style={{ 
                      flex: isMobile ? 'none' : 1, 
                      width: isMobile ? '100%' : 'auto',
                      minWidth: isMobile ? 'auto' : '100px',
                      padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                    }}
                  >
                    <Edit size={16} style={{ marginRight: '0.25rem' }} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteAuction(auction.id)}
                    className="btn btn-danger"
                    style={{ 
                      flex: isMobile ? 'none' : 1, 
                      width: isMobile ? '100%' : 'auto',
                      minWidth: isMobile ? 'auto' : '100px',
                      padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                    }}
                  >
                    <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                    Eliminar
                  </button>
                  {auction.status === 'ended' && (
                    <button
                      onClick={() => handleRepublishAuction(auction)}
                      className="btn btn-primary"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      Republicar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Auction Tab */}
      {(activeTab === 'create-auction' || activeTab === 'edit-auction') && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('auctions')}
              className="btn btn-secondary"
              style={{ marginBottom: '1rem' }}
            >
              ← Volver a Subastas
            </button>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {editingAuction ? 'Editar Subasta' : 'Crear Nueva Subasta'}
            </h2>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            <div className={isMobile ? 'mobile-form-compact' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Título */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Título *
                </label>
                <input
                  type="text"
                  value={auctionForm.title}
                  onChange={(e) => setAuctionForm({ ...auctionForm, title: e.target.value })}
                  placeholder="Ej: iPhone 13 Pro Max 256GB"
                  style={{
                    width: '100%',
                    padding: isMobile ? '1rem' : '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Descripción *
                </label>
                <textarea
                  value={auctionForm.description}
                  onChange={(e) => setAuctionForm({ ...auctionForm, description: e.target.value })}
                  placeholder="Describe el producto detalladamente..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Precios */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio Inicial * (mín. $100)
                  </label>
                  <input
                    type="number"
                    value={auctionForm.startingPrice}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setAuctionForm({ ...auctionForm, startingPrice: value, currentPrice: value });
                    }}
                    min="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio "Compra Ya" (opcional)
                  </label>
                  <input
                    type="number"
                    value={auctionForm.buyNowPrice}
                    onChange={(e) => setAuctionForm({ ...auctionForm, buyNowPrice: Number(e.target.value) })}
                    min="0"
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {/* Duración */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Duración *
                </label>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationDays}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationDays: Number(e.target.value) })}
                      min="0"
                      placeholder="Días"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationHours}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationHours: Number(e.target.value) })}
                      min="0"
                      max="23"
                      placeholder="Horas"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <input
                      type="number"
                      value={auctionForm.durationMinutes}
                      onChange={(e) => setAuctionForm({ ...auctionForm, durationMinutes: Number(e.target.value) })}
                      min="5"
                      placeholder="Minutos"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Categoría y Condición */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Categoría *
                  </label>
                  <select
                    value={auctionForm.categoryId}
                    onChange={(e) => setAuctionForm({ ...auctionForm, categoryId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  >
                    {mockCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Condición *
                  </label>
                  <select
                    value={auctionForm.condition}
                    onChange={(e) => setAuctionForm({ ...auctionForm, condition: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="new">Nuevo</option>
                    <option value="like-new">Como Nuevo</option>
                    <option value="excellent">Excelente</option>
                    <option value="good">Bueno</option>
                    <option value="fair">Regular</option>
                  </select>
                </div>
              </div>

              {/* Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imágenes * (mín. 1, máx. 3)
                </label>
                <ImageUploader
                  images={auctionForm.images}
                  onChange={(images) => setAuctionForm({ ...auctionForm, images })}
                  maxImages={3}
                />
              </div>

              {/* Stickers */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Stickers (opcional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableStickers.map(sticker => {
                    const stickerId = sticker.id;
                    return (
                      <label
                        key={stickerId}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: `2px solid ${auctionForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--border)'}`,
                          background: auctionForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--bg-primary)',
                          color: auctionForm.stickers.includes(stickerId) ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={auctionForm.stickers.includes(stickerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAuctionForm({ ...auctionForm, stickers: [...auctionForm.stickers, stickerId] });
                            } else {
                              setAuctionForm({ ...auctionForm, stickers: auctionForm.stickers.filter(s => s !== stickerId) });
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {sticker.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={auctionForm.featured}
                    onChange={(e) => setAuctionForm({ ...auctionForm, featured: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Destacada</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={auctionForm.scheduled}
                    onChange={(e) => setAuctionForm({ ...auctionForm, scheduled: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Programada</span>
                </label>
              </div>

              {/* Fecha programada */}
              {auctionForm.scheduled && (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={auctionForm.scheduledDate}
                      onChange={(e) => setAuctionForm({ ...auctionForm, scheduledDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={auctionForm.scheduledTime}
                      onChange={(e) => setAuctionForm({ ...auctionForm, scheduledTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Botones */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <button
                  onClick={editingAuction ? handleSaveAuction : handleCreateAuction}
                  className="btn btn-primary"
                  style={{ 
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  <Save size={isMobile ? 18 : 20} style={{ marginRight: '0.5rem' }} />
                  {editingAuction ? 'Guardar Cambios' : 'Crear Subasta'}
                </button>
                <button
                  onClick={() => setActiveTab('auctions')}
                  className="btn btn-secondary"
                  style={{ 
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Productos Tab */}
      {activeTab === 'products' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Gestión de Productos</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="lowStock">Stock Bajo</option>
                <option value="outOfStock">Sin Stock</option>
                <option value="featured">Destacados</option>
              </select>
              <button
                onClick={handleCreateProduct}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={20} />
                Nuevo Producto
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {products
              .filter((p: Product) => {
                if (inventoryFilter === 'active') return p.active !== false;
                if (inventoryFilter === 'lowStock') return p.stock > 0 && p.stock < 5;
                if (inventoryFilter === 'outOfStock') return p.stock === 0;
                if (inventoryFilter === 'featured') return p.featured === true;
                return true;
              })
              .map((product: Product) => (
                <div key={product.id} style={{
                  background: 'var(--bg-secondary)',
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '0.5rem',
                          marginBottom: '1rem'
                        }}
                      />
                    )}
                    <h3 style={{ 
                      margin: 0, 
                      marginBottom: '0.5rem', 
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                      maxHeight: '2.6em'
                    }}>
                      {product.name}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Precio: {formatCurrency(product.price)}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Stock: <span style={{
                        color: product.stock === 0 ? 'var(--error)' : product.stock < 5 ? 'var(--warning)' : 'var(--success)',
                        fontWeight: 600
                      }}>
                        {product.stock} unidades
                      </span>
                    </p>
                    <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Estado: <span style={{
                        color: product.active !== false ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: 600
                      }}>
                        {product.active !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn btn-secondary"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      <Edit size={16} style={{ marginRight: '0.25rem' }} />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="btn btn-danger"
                      style={{ 
                        flex: isMobile ? 'none' : 1, 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? 'auto' : '100px',
                        padding: isMobile ? '0.75rem 1rem' : '0.625rem 1rem'
                      }}
                    >
                      <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create/Edit Product Tab */}
      {(activeTab === 'create-product' || activeTab === 'edit-product') && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setActiveTab('products')}
              className="btn btn-secondary"
              style={{ marginBottom: '1rem' }}
            >
              ← Volver a Productos
            </button>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
              {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
            </h2>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            maxWidth: '800px'
          }}>
            <div className={isMobile ? 'mobile-form-compact' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Nombre */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ej: iPhone 13 Pro Max"
                  style={{
                    width: '100%',
                    padding: isMobile ? '1rem' : '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Descripción *
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe el producto..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Precio y Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Precio * (mín. $100)
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    min="100"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Categoría *
                </label>
                <select
                  value={productForm.categoryId}
                  onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  {mockCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Imágenes */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imágenes * (mín. 1, máx. 5)
                </label>
                <ImageUploader
                  images={productForm.images}
                  onChange={(images) => setProductForm({ ...productForm, images })}
                  maxImages={5}
                />
              </div>

              {/* Stickers */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Stickers (opcional)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {availableStickers.map(sticker => {
                    const stickerId = sticker.id;
                    return (
                      <label
                        key={stickerId}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          border: `2px solid ${productForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--border)'}`,
                          background: productForm.stickers.includes(stickerId) ? 'var(--primary)' : 'var(--bg-primary)',
                          color: productForm.stickers.includes(stickerId) ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={productForm.stickers.includes(stickerId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProductForm({ ...productForm, stickers: [...productForm.stickers, stickerId] });
                            } else {
                              setProductForm({ ...productForm, stickers: productForm.stickers.filter(s => s !== stickerId) });
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        {sticker.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Activo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>Destacado</span>
                </label>
              </div>

              {/* Botones */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '1rem',
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <button
                  onClick={handleSaveProduct}
                  className="btn btn-primary"
                  style={{ 
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  <Save size={isMobile ? 18 : 20} style={{ marginRight: '0.5rem' }} />
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className="btn btn-secondary"
                  style={{ 
                    width: isMobile ? '100%' : 'auto',
                    padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usuarios Tab */}
      {activeTab === 'users' && (
        <div className={isMobile ? 'user-management-mobile' : ''}>
          {/* Header con título y descripción (igual que pedidos) */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: isMobile ? '0 1rem' : '0'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)', 
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Gestión de Usuarios
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Administrá y gestioná todos los usuarios del sistema
              </p>
            </div>
          </div>

          {/* Estadísticas rápidas - Grid compacto en móvil (igual que pedidos) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.5rem' : '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: isMobile ? '0 1rem' : '0'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Users size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Total</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {realUsers.length}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                usuarios
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <CheckCircle size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Activos</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {realUsers.filter((u: any) => u.active !== false).length}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                usuarios activos
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <User size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Admins</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {realUsers.filter((u: any) => u.isAdmin).length}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                administradores
              </div>
            </div>
          </div>

          {/* Filtros mejorados (igual que pedidos) */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: isMobile ? '1rem' : '1.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            marginBottom: '1.5rem',
            margin: isMobile ? '0 1rem 1.5rem' : '0 0 1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={20} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Buscar usuarios por nombre, email o ID..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
            </div>
          </div>
          {loadingUsers ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={48} style={{ 
                color: 'var(--primary)',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Cargando usuarios...</p>
            </div>
          ) : (
            <div className={isMobile ? 'user-management-list-mobile' : ''} style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: isMobile ? '0.75rem' : '1.5rem',
              padding: isMobile ? '0 1rem' : '0'
            }}>
              {realUsers
                .filter((userItem: any) => {
                  if (!userSearchQuery) return true;
                  const query = userSearchQuery.toLowerCase();
                  return (
                    userItem.username?.toLowerCase().includes(query) ||
                    userItem.email?.toLowerCase().includes(query) ||
                    userItem.id?.toLowerCase().includes(query)
                  );
                })
                .map((userItem: any) => (
                <div 
                  key={userItem.id} 
                  className={isMobile ? 'user-card-mobile' : ''}
                  style={{
                    background: 'var(--bg-secondary)',
                    padding: isMobile ? '1rem' : '1.5rem',
                    borderRadius: '1rem',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => !isMobile && setSelectedUser(userItem)}
                  onTouchStart={(e) => {
                    if (isMobile) {
                      const touch = e.touches[0];
                      (e.currentTarget as any).touchStartX = touch.clientX;
                      (e.currentTarget as any).touchStartY = touch.clientY;
                    }
                  }}
                  onTouchMove={(e) => {
                    if (isMobile) {
                      const touch = e.touches[0];
                      const startX = (e.currentTarget as any).touchStartX;
                      const deltaX = touch.clientX - startX;
                      if (Math.abs(deltaX) > 50) {
                        e.currentTarget.style.transform = `translateX(${deltaX}px)`;
                      }
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (isMobile) {
                      const touch = e.changedTouches[0];
                      const startX = (e.currentTarget as any).touchStartX;
                      const deltaX = touch.clientX - startX;
                      if (deltaX < -100) {
                        // Swipe left - mostrar acciones
                        (e.currentTarget as any).classList.add('swiped');
                      } else {
                        e.currentTarget.style.transform = '';
                        (e.currentTarget as any).classList.remove('swiped');
                      }
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.25rem'
                    }}>
                      {userItem.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {userItem.username || 'Sin nombre'}
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {userItem.email || 'Sin email'}
                      </p>
                    </div>
                    {userItem.isAdmin && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        background: 'var(--warning)',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        Admin
                      </span>
                    )}
                  </div>
                  {!isMobile && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      flexWrap: 'wrap',
                      flexDirection: 'row'
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(userItem);
                        }}
                        className="btn btn-secondary"
                        style={{ 
                          flex: 1,
                          padding: '0.625rem 1rem'
                        }}
                      >
                        <Eye size={16} style={{ marginRight: '0.25rem' }} />
                        Ver Detalles
                      </button>
                    </div>
                  )}

                  {/* Swipe Actions (Mobile) */}
                  {isMobile && (
                    <div className="user-swipe-actions">
                      <button
                        className="user-swipe-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(userItem);
                        }}
                      >
                        <Eye size={18} />
                        Ver
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {selectedUser && (
            <UserDetailsModal
              user={selectedUser}
              onClose={() => setSelectedUser(null)}
              onUpdate={() => {
                loadUsers();
              }}
            />
          )}
        </div>
      )}

      {/* Pedidos Tab - Versión Mejorada y Profesional */}
      {activeTab === 'orders' && (
        <div>
          {/* Header con título y botón limpiar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                Gestión de Pedidos
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Administrá y seguí el estado de todos los pedidos
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  if (window.confirm('¿Eliminar pedidos finalizados (entregados/cancelados) de más de 30 días?\n\nEsta acción no se puede deshacer.')) {
                    const now = Date.now();
                    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
                    const ordersToDelete = orders.filter((o: Order) => {
                      if (['delivered', 'cancelled', 'expired', 'payment_expired'].includes(o.status)) {
                        const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                        return orderDate < thirtyDaysAgo;
                      }
                      return false;
                    });
                    
                    let deletedCount = 0;
                    for (const order of ordersToDelete) {
                      try {
                        await remove(dbRef(realtimeDb, `orders/${order.id}`));
                        deletedCount++;
                        logOrderAction('Pedido eliminado (limpieza >30 días)', order.id, user?.id, user?.username, { 
                          status: order.status,
                          actionType: 'cleanup_old'
                        });
                      } catch (error) {
                        console.error(`Error eliminando pedido ${order.id}:`, error);
                      }
                    }
                    
                    const cleanedOrders = orders.filter((o: Order) => !ordersToDelete.find(d => d.id === o.id));
                    setOrders(cleanedOrders);
                    logAdminAction(`Limpieza de pedidos: ${deletedCount} eliminados de Firebase`, user?.id, user?.username);
                    alert(`✅ ${deletedCount} pedidos antiguos eliminados de Firebase`);
                  }
                }}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Trash size={18} />
                {!isMobile && 'Limpiar >30 días'}
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('¿Eliminar pedidos finalizados (entregados/cancelados) de menos de 30 días?\n\nEsta acción no se puede deshacer.')) {
                    const now = Date.now();
                    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
                    const ordersToDelete = orders.filter((o: Order) => {
                      if (['delivered', 'cancelled', 'expired', 'payment_expired'].includes(o.status)) {
                        const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                        return orderDate >= thirtyDaysAgo && orderDate < now;
                      }
                      return false;
                    });
                    
                    if (ordersToDelete.length === 0) {
                      alert('ℹ️ No hay pedidos finalizados de menos de 30 días para eliminar');
                      return;
                    }
                    
                    let deletedCount = 0;
                    for (const order of ordersToDelete) {
                      try {
                        await remove(dbRef(realtimeDb, `orders/${order.id}`));
                        deletedCount++;
                        logOrderAction('Pedido eliminado (limpieza <30 días)', order.id, user?.id, user?.username, { 
                          status: order.status,
                          actionType: 'cleanup_recent'
                        });
                      } catch (error) {
                        console.error(`Error eliminando pedido ${order.id}:`, error);
                      }
                    }
                    
                    const cleanedOrders = orders.filter((o: Order) => !ordersToDelete.find(d => d.id === o.id));
                    setOrders(cleanedOrders);
                    logAdminAction(`Limpieza de pedidos recientes: ${deletedCount} eliminados de Firebase`, user?.id, user?.username);
                    alert(`✅ ${deletedCount} pedidos recientes eliminados de Firebase`);
                  }
                }}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Trash size={18} />
                {!isMobile && 'Limpiar <30 días'}
              </button>
            </div>
          </div>

          {/* Estadísticas rápidas - Grid compacto en móvil */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.5rem' : '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Clock size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Pendientes</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => o.status === 'pending_payment').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <CheckCircle size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Confirmados</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => o.status === 'payment_confirmed').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Truck size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>En Tránsito</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => ['in_transit', 'shipped'].includes(o.status)).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <ShoppingBag size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Entregados</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => o.status === 'delivered').length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <AlertTriangle size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Con Demora</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => {
                  if (!['in_transit', 'shipped', 'processing', 'preparing'].includes(o.status)) return false;
                  const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                  const daysSince = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
                  return daysSince > 5; // Más de 5 días
                }).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Package size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Sin Stock</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => {
                  // Pedidos que están en procesamiento pero tienen problemas de stock
                  // Podemos detectar esto por pedidos que llevan mucho tiempo en processing sin avanzar
                  if (o.status !== 'processing' && o.status !== 'payment_confirmed') return false;
                  const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                  const daysSince = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
                  return daysSince > 3 && o.status === 'processing'; // Más de 3 días en processing
                }).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <AlertCircle size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Con Problemas</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => {
                  // Pedidos cancelados o expirados
                  return ['cancelled', 'expired', 'payment_expired'].includes(o.status);
                }).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <FileText size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>En Revisión</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => {
                  // Pedidos que están en payment_confirmed pero no han avanzado a processing
                  // después de cierto tiempo (necesitan revisión)
                  if (o.status !== 'payment_confirmed') return false;
                  const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
                  const daysSince = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);
                  return daysSince > 1 && daysSince <= 3; // Entre 1 y 3 días en confirmado
                }).length}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Package size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>De Externo</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {orders.filter((o: Order) => {
                  // Pedidos que tienen productType 'auction' o alguna marca de externo
                  // Por ahora, podemos usar pedidos de subastas como "externos"
                  return o.productType === 'auction' || (o as any).external === true;
                }).length}
              </div>
            </div>
          </div>

          {/* Barra de acciones masivas */}
          {selectedOrders.size > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              padding: isMobile ? '1rem' : '1.25rem',
              borderRadius: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckSquare size={20} />
                <span style={{ fontWeight: 600, fontSize: isMobile ? '0.875rem' : '1rem' }}>
                  {selectedOrders.size} pedido{selectedOrders.size !== 1 ? 's' : ''} seleccionado{selectedOrders.size !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    if (window.confirm(`¿Cancelar ${selectedOrders.size} pedido${selectedOrders.size !== 1 ? 's' : ''} seleccionado${selectedOrders.size !== 1 ? 's' : ''}?`)) {
                      let cancelledCount = 0;
                      for (const orderId of selectedOrders) {
                        try {
                          await update(dbRef(realtimeDb, `orders/${orderId}`), { status: 'cancelled' });
                          cancelledCount++;
                          const order = orders.find(o => o.id === orderId);
                          if (order) {
                            logOrderAction('Pedido cancelado (masivo)', orderId, user?.id, user?.username, { 
                              oldStatus: order.status,
                              newStatus: 'cancelled',
                              actionType: 'bulk_cancel'
                            });
                          }
                        } catch (error) {
                          console.error(`Error cancelando pedido ${orderId}:`, error);
                        }
                      }
                      // Actualizar store para cada pedido cancelado
                      for (const orderId of selectedOrders) {
                        updateOrderStatus(orderId, 'cancelled');
                      }
                      setSelectedOrders(new Set());
                      alert(`✅ ${cancelledCount} pedido${cancelledCount !== 1 ? 's' : ''} cancelado${cancelledCount !== 1 ? 's' : ''}`);
                    }
                  }}
                  className="btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                    fontSize: isMobile ? '0.875rem' : '0.9375rem'
                  }}
                >
                  <XCircle size={16} style={{ marginRight: '0.5rem' }} />
                  Cancelar Seleccionados
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm(`¿Eliminar permanentemente ${selectedOrders.size} pedido${selectedOrders.size !== 1 ? 's' : ''} seleccionado${selectedOrders.size !== 1 ? 's' : ''}?\n\nEsta acción no se puede deshacer.`)) {
                      let deletedCount = 0;
                      for (const orderId of selectedOrders) {
                        try {
                          await remove(dbRef(realtimeDb, `orders/${orderId}`));
                          deletedCount++;
                          const order = orders.find(o => o.id === orderId);
                          if (order) {
                            logOrderAction('Pedido eliminado (masivo)', orderId, user?.id, user?.username, { 
                              status: order.status,
                              actionType: 'bulk_delete'
                            });
                          }
                        } catch (error) {
                          console.error(`Error eliminando pedido ${orderId}:`, error);
                        }
                      }
                      const remainingOrders = orders.filter(o => !selectedOrders.has(o.id));
                      setOrders(remainingOrders);
                      setSelectedOrders(new Set());
                      alert(`✅ ${deletedCount} pedido${deletedCount !== 1 ? 's' : ''} eliminado${deletedCount !== 1 ? 's' : ''} de Firebase`);
                    }
                  }}
                  className="btn"
                  style={{
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                    fontSize: isMobile ? '0.875rem' : '0.9375rem'
                  }}
                >
                  <Trash2 size={16} style={{ marginRight: '0.5rem' }} />
                  Eliminar Seleccionados
                </button>
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                    fontSize: isMobile ? '0.875rem' : '0.9375rem'
                  }}
                >
                  <Square size={16} style={{ marginRight: '0.5rem' }} />
                  Deseleccionar Todo
                </button>
              </div>
            </div>
          )}

          {/* Filtros mejorados */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: isMobile ? '1rem' : '1.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={20} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Buscar por número de pedido, ID, cliente, producto o monto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '16px' : '1rem',
                  cursor: 'pointer',
                  minWidth: isMobile ? '100%' : '200px'
                }}
              >
                <option value="all">📋 Todos los estados</option>
                <option value="pending_payment">⏳ Pago Pendiente</option>
                <option value="payment_confirmed">✅ Pago Confirmado</option>
                <option value="processing">🔄 Procesando</option>
                <option value="in_transit">🚚 En Tránsito</option>
                <option value="delivered">📦 Entregado</option>
                <option value="cancelled">❌ Cancelado</option>
              </select>
            </div>
          </div>

          {/* Lista de Pedidos - Tabla Profesional (Desktop) / Grid Compacto (Mobile) */}
          {isMobile ? (
            // Vista móvil: Grid tipo tablero de ajedrez
            <div style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: '1rem', 
              border: '1px solid var(--border)',
              padding: '1rem'
            }}>
              {filteredOrders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: 'var(--text-secondary)'
                }}>
                  <ShoppingCart size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No se encontraron pedidos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem'
                }}>
                  {filteredOrders.map((order: Order, index: number) => {
                    const statusBadge = getStatusBadge(order.status);
                    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { 
                      day: '2-digit', 
                      month: 'short'
                    }) : 'N/A';
                    
                    // Colores según estado (tipo tablero de ajedrez alternando)
                    const statusColors: Record<string, { bg: string; text: string }> = {
                      pending_payment: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', text: 'white' },
                      payment_confirmed: { bg: 'linear-gradient(135deg, #10b981, #059669)', text: 'white' },
                      processing: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', text: 'white' },
                      in_transit: { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', text: 'white' },
                      shipped: { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', text: 'white' },
                      delivered: { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', text: 'white' },
                      cancelled: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', text: 'white' },
                      expired: { bg: 'linear-gradient(135deg, #6b7280, #4b5563)', text: 'white' },
                      payment_expired: { bg: 'linear-gradient(135deg, #6b7280, #4b5563)', text: 'white' },
                      preparing: { bg: 'linear-gradient(135deg, #f97316, #ea580c)', text: 'white' }
                    };
                    
                    const colors = statusColors[order.status] || { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)' };
                    
                    return (
                      <div
                        key={`order-${order.id}-${index}`}
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          borderRadius: '0.75rem',
                          padding: '0.875rem',
                          aspectRatio: '1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                        }}
                      >
                        {/* Checkbox de selección */}
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          left: '0.5rem',
                          zIndex: 10
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedOrders);
                              if (e.target.checked) {
                                newSelected.add(order.id);
                              } else {
                                newSelected.delete(order.id);
                              }
                              setSelectedOrders(newSelected);
                            }}
                            style={{ 
                              cursor: 'pointer', 
                              width: '18px', 
                              height: '18px',
                              accentColor: 'white'
                            }}
                          />
                        </div>
                        
                        {/* Botones de acción rápida */}
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          display: 'flex',
                          gap: '0.25rem',
                          zIndex: 10
                        }}
                        onClick={(e) => e.stopPropagation()}
                        >
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Cancelar el pedido ${order.orderNumber || `#${order.id.slice(-6)}`}?`)) {
                                  try {
                                    await update(dbRef(realtimeDb, `orders/${order.id}`), { status: 'cancelled' });
                                    updateOrderStatus(order.id, 'cancelled');
                                    logOrderAction('Pedido cancelado', order.id, user?.id, user?.username, { 
                                      oldStatus: order.status,
                                      newStatus: 'cancelled',
                                      actionType: 'cancel'
                                    });
                                    alert('✅ Pedido cancelado');
                                  } catch (error) {
                                    console.error('Error cancelando pedido:', error);
                                    alert('❌ Error al cancelar');
                                  }
                                }
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '0.25rem',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Cancelar"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Eliminar el pedido ${order.orderNumber || `#${order.id.slice(-6)}`}?\n\nEsta acción no se puede deshacer.`)) {
                                try {
                                  await remove(dbRef(realtimeDb, `orders/${order.id}`));
                                  const remainingOrders = orders.filter(o => o.id !== order.id);
                                  setOrders(remainingOrders);
                                  logOrderAction('Pedido eliminado', order.id, user?.id, user?.username, { 
                                    status: order.status,
                                    actionType: 'delete'
                                  });
                                  alert('✅ Pedido eliminado');
                                } catch (error) {
                                  console.error('Error eliminando pedido:', error);
                                  alert('❌ Error al eliminar');
                                }
                              }
                            }}
                            style={{
                              background: 'rgba(239, 68, 68, 0.8)',
                              border: 'none',
                              borderRadius: '0.25rem',
                              padding: '0.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ 
                            fontSize: '0.625rem', 
                            opacity: 0.9, 
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {order.orderNumber ? `#${order.orderNumber.slice(-6)}` : `#${order.id.slice(-6).toUpperCase()}`}
                          </div>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {order.productName || 'Producto'}
                          </div>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '0.25rem',
                          marginTop: '0.5rem'
                        }}>
                          <div style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 700,
                            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}>
                            {formatCurrency(order.amount)}
                          </div>
                          <div style={{ 
                            fontSize: '0.625rem', 
                            opacity: 0.9,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Calendar size={10} />
                            {orderDate}
                          </div>
                        </div>
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          fontSize: '0.625rem',
                          opacity: 0.8,
                          fontWeight: 600
                        }}>
                          {statusBadge.text.split(' ')[0]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Vista desktop: Tabla tradicional
            <div className={isMobile ? 'mobile-table-container' : ''} style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: '1rem', 
              border: '1px solid var(--border)',
              overflow: isMobile ? 'auto' : 'hidden'
            }}>
              {filteredOrders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: 'var(--text-secondary)'
                }}>
                  <ShoppingCart size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No se encontraron pedidos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className={isMobile ? 'mobile-table' : ''} style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      background: 'var(--bg-primary)', 
                      borderBottom: '2px solid var(--border)'
                    }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem',
                        width: '50px'
                      }}>
                        <input
                          type="checkbox"
                          checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.has(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
                            } else {
                              const filteredIds = new Set(filteredOrders.map(o => o.id));
                              setSelectedOrders(new Set(Array.from(selectedOrders).filter(id => !filteredIds.has(id))));
                            }
                          }}
                          style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Pedido</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Cliente</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Monto</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Estado</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Fecha</th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'center', 
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order: Order, index: number) => {
                      const statusBadge = getStatusBadge(order.status);
                      const deliveryBadge = getDeliveryMethodBadge(order.deliveryMethod || 'shipping');
                      const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('es-AR', { 
                        day: '2-digit', 
                        month: 'short',
                        year: isMobile ? '2-digit' : 'numeric'
                      }) : 'N/A';
                      
                      // Determinar siguiente estado lógico
                      const getNextStatus = (current: OrderStatus): OrderStatus | null => {
                        const flow: Record<OrderStatus, OrderStatus | null> = {
                          pending_payment: 'payment_confirmed',
                          payment_confirmed: 'processing',
                          processing: 'in_transit',
                          in_transit: 'delivered',
                          delivered: null,
                          cancelled: null,
                          payment_expired: null,
                          expired: null,
                          preparing: 'shipped',
                          shipped: 'delivered'
                        };
                        return flow[current] || null;
                      };
                      
                      const nextStatus = getNextStatus(order.status);
                      
                      return (
                        <tr 
                          key={`order-${order.id}-${index}`}
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            transition: 'background 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newSelected = new Set(selectedOrders);
                                if (e.target.checked) {
                                  newSelected.add(order.id);
                                } else {
                                  newSelected.delete(order.id);
                                }
                                setSelectedOrders(newSelected);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                            />
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                              {order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`}
                            </div>
                            {order.orderNumber && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                ID: {order.id.slice(-8).toUpperCase()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <User size={16} style={{ color: 'var(--text-secondary)' }} />
                              <span style={{ color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                                {order.userName || 'Sin nombre'}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <span style={{ 
                              fontWeight: 700, 
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '0.875rem' : '1rem'
                            }}>
                              {formatCurrency(order.amount)}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <span 
                              className={statusBadge.className} 
                              style={{ 
                                padding: '0.5rem 0.75rem', 
                                borderRadius: '0.5rem', 
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                display: 'inline-block',
                                fontWeight: 600
                              }}
                            >
                              {statusBadge.text}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center', fontSize: isMobile ? '0.75rem' : '0.8125rem', color: 'var(--text-secondary)' }}>
                              <Calendar size={14} />
                              {orderDate}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div 
                              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="btn btn-secondary"
                                style={{ 
                                  padding: '0.5rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                }}
                                title="Ver detalles"
                              >
                                <Eye size={14} />
                                {!isMobile && 'Ver'}
                              </button>
                              {nextStatus && (
                                <button
                                  onClick={() => {
                                    const statusLabels: Record<OrderStatus, string> = {
                                      pending_payment: 'Confirmar Pago',
                                      payment_confirmed: 'Iniciar Procesamiento',
                                      processing: 'Marcar como En Tránsito',
                                      in_transit: 'Marcar como Entregado',
                                      delivered: '',
                                      cancelled: '',
                                      payment_expired: '',
                                      expired: '',
                                      preparing: 'Marcar como Enviado',
                                      shipped: 'Marcar como Entregado'
                                    };
                                    
                                    const orderDisplay = order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`;
                                    const confirmMessage = `¿${statusLabels[nextStatus] || 'Actualizar estado'} del pedido ${orderDisplay}?\n\nEstado actual: ${statusBadge.text}\nNuevo estado: ${getStatusBadge(nextStatus).text}`;
                                    
                                    if (window.confirm(confirmMessage)) {
                                      const previousStatus = order.status;
                                      updateOrderStatus(order.id, nextStatus);
                                      
                                      // Registrar en log de acciones
                                      logOrderAction('Estado actualizado', order.id, user?.id, user?.username, { 
                                        oldStatus: order.status, 
                                        newStatus: nextStatus,
                                        actionType: 'manual'
                                      });
                                      
                                      // Registrar en log de transacciones
                                      if (order.orderNumber) {
                                        logOrderStatusChange(
                                          order.id,
                                          order.orderNumber,
                                          order.userId,
                                          order.userName,
                                          nextStatus,
                                          order.amount,
                                          previousStatus,
                                          nextStatus,
                                          user?.id,
                                          user?.username
                                        ).catch(err => console.error('Error registrando transacción:', err));
                                      }
                                    }
                                  }}
                                  className="btn btn-primary"
                                  style={{ 
                                    padding: '0.5rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={`Avanzar a: ${getStatusBadge(nextStatus).text}`}
                                >
                                  <ArrowRight size={14} />
                                  {!isMobile && 'Siguiente'}
                                </button>
                              )}
                              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const orderDisplay = order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`;
                                    if (window.confirm(`¿Cancelar el pedido ${orderDisplay}?\n\nEsta acción cambiará el estado a "Cancelado".`)) {
                                      try {
                                        await update(dbRef(realtimeDb, `orders/${order.id}`), { status: 'cancelled' });
                                        updateOrderStatus(order.id, 'cancelled');
                                        logOrderAction('Pedido cancelado', order.id, user?.id, user?.username, { 
                                          oldStatus: order.status,
                                          newStatus: 'cancelled',
                                          actionType: 'cancel'
                                        });
                                        alert('✅ Pedido cancelado');
                                      } catch (error) {
                                        console.error('Error cancelando pedido:', error);
                                        alert('❌ Error al cancelar el pedido');
                                      }
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Cancelar pedido"
                                >
                                  <XCircle size={14} />
                                  {!isMobile && 'Cancelar'}
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const orderDisplay = order.orderNumber || `#${order.id.slice(-8).toUpperCase()}`;
                                  if (window.confirm(`¿Eliminar permanentemente el pedido ${orderDisplay}?\n\nEsta acción no se puede deshacer.`)) {
                                    try {
                                      await remove(dbRef(realtimeDb, `orders/${order.id}`));
                                      const remainingOrders = orders.filter(o => o.id !== order.id);
                                      setOrders(remainingOrders);
                                      logOrderAction('Pedido eliminado', order.id, user?.id, user?.username, { 
                                        status: order.status,
                                        actionType: 'delete'
                                      });
                                      alert('✅ Pedido eliminado de Firebase');
                                    } catch (error) {
                                      console.error('Error eliminando pedido:', error);
                                      alert('❌ Error al eliminar el pedido');
                                    }
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{ 
                                  padding: '0.5rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                  color: 'var(--error)'
                                }}
                                title="Eliminar pedido"
                              >
                                <Trash2 size={14} />
                                {!isMobile && 'Borrar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* Resumen de totales */}
          {filteredOrders.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de pedidos mostrados: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
                  {filteredOrders.length}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Valor total: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '1.125rem' }}>
                  {formatCurrency(filteredOrders.reduce((sum, o: Order) => sum + o.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bots Tab - Versión Mejorada y Profesional */}
      {activeTab === 'bots' && (
        <div>
          {/* Header con título y acciones rápidas */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)', 
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Gestión de Bots
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Administrá y controlá los bots de subastas automáticos
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const activeBots = bots.filter((b: any) => b.isActive);
                  if (activeBots.length === 0) {
                    alert('⚠️ No hay bots activos para desactivar');
                    return;
                  }
                  if (window.confirm(`¿Desactivar todos los ${activeBots.length} bots activos?`)) {
                    activeBots.forEach((bot: any) => {
                      updateBot(bot.id, { isActive: false });
                    });
                    logAdminAction(`Desactivados todos los bots (${activeBots.length})`, user?.id, user?.username);
                  }
                }}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <XCircle size={18} />
                {!isMobile && 'Desactivar Todos'}
              </button>
              <button
                onClick={() => {
                  setBotForm({
                    name: '',
                    balance: 10000,
                    intervalMin: 5,
                    intervalMax: 15,
                    maxBidAmount: 5000,
                    targetAuctions: []
                  });
                  setShowBotForm(true);
                }}
                className="btn btn-primary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} />
                {!isMobile && 'Nuevo Bot'}
              </button>
            </div>
          </div>

          {/* Estadísticas rápidas - Grid compacto en móvil (igual que pedidos) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.5rem' : '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Bot size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Activos</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {bots.filter((b: any) => b.isActive).length}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                de {bots.length} total
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <DollarSign size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Balance Total</span>
              <div style={{ fontSize: isMobile ? '1rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.balance, 0))}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                Promedio: {formatCurrency(bots.length > 0 ? bots.reduce((sum: number, b: any) => sum + b.balance, 0) / bots.length : 0)}
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <TrendingUp size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Ofertas Máx</span>
              <div style={{ fontSize: isMobile ? '1rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.maxBidAmount, 0))}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                Capacidad total
              </div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Activity size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>En Subastas</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>
                {auctions.filter((a: any) => a.status === 'active').length}
              </div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>
                Subastas activas
              </div>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            padding: isMobile ? '1rem' : '1.5rem', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={20} style={{ 
                  position: 'absolute', 
                  left: '0.75rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)'
                }} />
                <input
                  type="text"
                  placeholder="Buscar bot por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                style={{
                  padding: '0.875rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '16px' : '1rem',
                  cursor: 'pointer',
                  minWidth: isMobile ? '100%' : '200px'
                }}
              >
                <option value="all">🤖 Todos los bots</option>
                <option value="active">✅ Activos</option>
                <option value="inactive">⏸️ Inactivos</option>
              </select>
            </div>
          </div>

          {/* Formulario de Bot - Colapsable */}
          {showBotForm && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: isMobile ? '1.5rem' : '2rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Crear Nuevo Bot</h3>
                <button
                  onClick={() => {
                    setShowBotForm(false);
                    setBotForm({
                      name: '',
                      balance: 10000,
                      intervalMin: 5,
                      intervalMax: 15,
                      maxBidAmount: 5000,
                      targetAuctions: []
                    });
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem' }}
                  title="Cerrar formulario"
                >
                  <XCircle size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Nombre del Bot *
                    </label>
                    <input
                      type="text"
                      value={botForm.name}
                      onChange={(e) => setBotForm({ ...botForm, name: e.target.value })}
                      placeholder="Ej: Bot Agresivo, Bot Conservador"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Balance Inicial *
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={botForm.balance}
                      onChange={(e) => setBotForm({ ...botForm, balance: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Oferta Máxima *
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={botForm.maxBidAmount}
                      onChange={(e) => setBotForm({ ...botForm, maxBidAmount: Number(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    />
                  </div>
                  <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        Intervalo Mín (seg) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={botForm.intervalMin}
                        onChange={(e) => setBotForm({ ...botForm, intervalMin: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: isMobile ? '16px' : '1rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        Intervalo Máx (seg) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        value={botForm.intervalMax}
                        onChange={(e) => setBotForm({ ...botForm, intervalMax: Number(e.target.value) })}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: isMobile ? '16px' : '1rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  marginTop: '0.5rem',
                  flexDirection: isMobile ? 'column' : 'row'
                }}>
                  <button
                    onClick={() => {
                      if (!botForm.name.trim()) {
                        alert('⚠️ Por favor ingresa un nombre para el bot');
                        return;
                      }
                      if (botForm.balance < 100) {
                        alert('⚠️ El balance debe ser al menos $100');
                        return;
                      }
                      if (botForm.maxBidAmount < 100) {
                        alert('⚠️ La oferta máxima debe ser al menos $100');
                        return;
                      }
                      if (botForm.intervalMin >= botForm.intervalMax) {
                        alert('⚠️ El intervalo mínimo debe ser menor que el máximo');
                        return;
                      }
                      if (botForm.intervalMin < 1 || botForm.intervalMax > 300) {
                        alert('⚠️ Los intervalos deben estar entre 1 y 300 segundos');
                        return;
                      }
                      handleAddBot();
                      setShowBotForm(false);
                    }}
                    className="btn btn-primary"
                    style={{ 
                      flex: isMobile ? 'none' : 1,
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                    }}
                  >
                    <Plus size={18} style={{ marginRight: '0.5rem' }} />
                    Crear Bot
                  </button>
                  <button
                    onClick={() => {
                      setShowBotForm(false);
                      setBotForm({
                        name: '',
                        balance: 10000,
                        intervalMin: 5,
                        intervalMax: 15,
                        maxBidAmount: 5000,
                        targetAuctions: []
                      });
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      width: isMobile ? '100%' : 'auto',
                      padding: isMobile ? '0.875rem 1.25rem' : '0.75rem 1.5rem'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Bots Profesional */}
          <div style={{ 
            background: 'var(--bg-secondary)', 
            borderRadius: '1rem', 
            border: '1px solid var(--border)',
            overflow: isMobile ? 'auto' : 'hidden'
          }}>
            {(() => {
              // Eliminar duplicados por ID antes de filtrar
              const uniqueBots = Array.from(
                new Map(bots.map((bot: any) => [bot.id, bot])).values()
              );
              
              const filteredBots = uniqueBots.filter((bot: any) => {
                const matchesSearch = !searchTerm || bot.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesFilter = filterStatus === 'all' || 
                  (filterStatus === 'active' && bot.isActive) ||
                  (filterStatus === 'inactive' && !bot.isActive);
                return matchesSearch && matchesFilter;
              });

              // Contar ofertas de cada bot
              const getBotBidCount = (botId: string) => {
                return auctions.reduce((count: number, auction: any) => {
                  if (auction.bids) {
                    return count + auction.bids.filter((bid: any) => bid.userId === botId && bid.isBot).length;
                  }
                  return count;
                }, 0);
              };

              return filteredBots.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: 'var(--text-secondary)'
                }}>
                  <Bot size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No se encontraron bots</h3>
                  <p>Crea tu primer bot o ajusta los filtros de búsqueda</p>
                </div>
              ) : (
                <div className={isMobile ? 'mobile-table-container' : ''} style={{ 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '1rem', 
                  border: '1px solid var(--border)',
                  overflow: isMobile ? 'auto' : 'hidden'
                }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table className={isMobile ? 'mobile-table' : ''} style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ 
                        background: 'var(--bg-primary)', 
                        borderBottom: '2px solid var(--border)'
                      }}>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'left', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Nombre</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Balance</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Oferta Máx</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Intervalo</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Estado</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Ofertas</th>
                        <th style={{ 
                          padding: '1rem', 
                          textAlign: 'center', 
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          fontSize: isMobile ? '0.875rem' : '0.9375rem'
                        }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBots.map((bot: any, index: number) => {
                        const bidCount = getBotBidCount(bot.id);
                        return (
                          <tr 
                            key={`bot-${bot.id}-${index}`}
                            style={{ 
                              borderBottom: '1px solid var(--border)',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Bot size={20} style={{ color: bot.isActive ? 'var(--success)' : 'var(--text-secondary)' }} />
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                                  {bot.name}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <span style={{ 
                                fontWeight: 700, 
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }}>
                                {formatCurrency(bot.balance)}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              <span style={{ 
                                color: 'var(--text-secondary)',
                                fontSize: isMobile ? '0.875rem' : '0.9375rem'
                              }}>
                                {formatCurrency(bot.maxBidAmount)}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{ 
                                color: 'var(--text-secondary)',
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                fontFamily: 'monospace'
                              }}>
                                {bot.intervalMin}s-{bot.intervalMax}s
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.5rem',
                                fontSize: isMobile ? '0.75rem' : '0.8125rem',
                                fontWeight: 600,
                                display: 'inline-block',
                                background: bot.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                color: bot.isActive ? 'var(--success)' : 'var(--text-secondary)'
                              }}>
                                {bot.isActive ? '✅ Activo' : '⏸️ Inactivo'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                <TrendingUp size={14} style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ 
                                  color: 'var(--text-primary)',
                                  fontWeight: 600,
                                  fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                }}>
                                  {bidCount}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div 
                                style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
                              >
                                <button
                                  onClick={() => {
                                    const newBalance = prompt(`Recargar balance para "${bot.name}"\n\nBalance actual: ${formatCurrency(bot.balance)}\n\nIngresá el nuevo balance:`, bot.balance.toString());
                                    if (newBalance && !isNaN(Number(newBalance)) && Number(newBalance) >= 0) {
                                      updateBot(bot.id, { balance: Number(newBalance) });
                                      logAdminAction(`Balance recargado: ${bot.name} - ${formatCurrency(bot.balance)} → ${formatCurrency(Number(newBalance))}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Recargar balance"
                                >
                                  <DollarSign size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿${bot.isActive ? 'Desactivar' : 'Activar'} el bot "${bot.name}"?`)) {
                                      updateBot(bot.id, { isActive: !bot.isActive });
                                      logAdminAction(`Bot ${bot.isActive ? 'desactivado' : 'activado'}: ${bot.name}`, user?.id, user?.username);
                                    }
                                  }}
                                  className={bot.isActive ? "btn btn-secondary" : "btn btn-primary"}
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title={bot.isActive ? 'Desactivar' : 'Activar'}
                                >
                                  {bot.isActive ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                </button>
                                <button
                                  onClick={() => {
                                    const newMaxBid = prompt(`Cambiar oferta máxima para "${bot.name}"\n\nOferta máxima actual: ${formatCurrency(bot.maxBidAmount)}\n\nIngresá el nuevo monto máximo:`, bot.maxBidAmount.toString());
                                    if (newMaxBid && !isNaN(Number(newMaxBid)) && Number(newMaxBid) >= 100) {
                                      updateBot(bot.id, { maxBidAmount: Number(newMaxBid) });
                                      logAdminAction(`Oferta máxima actualizada: ${bot.name} - ${formatCurrency(bot.maxBidAmount)} → ${formatCurrency(Number(newMaxBid))}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Editar oferta máxima"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿Eliminar bot "${bot.name}"?\n\nEsta acción no se puede deshacer.`)) {
                                      deleteBot(bot.id);
                                      logAdminAction(`Bot eliminado: ${bot.name}`, user?.id, user?.username);
                                    }
                                  }}
                                  className="btn btn-danger"
                                  style={{ 
                                    padding: '0.5rem',
                                    fontSize: isMobile ? '0.75rem' : '0.8125rem'
                                  }}
                                  title="Eliminar bot"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Resumen */}
          {bots.length > 0 && (
            <div style={{
              marginTop: '1.5rem',
              padding: '1.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Total de bots: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>
                  {bots.length} ({bots.filter((b: any) => b.isActive).length} activos)
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Balance total: 
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', marginLeft: '0.5rem', fontSize: '1.125rem' }}>
                  {formatCurrency(bots.reduce((sum: number, b: any) => sum + b.balance, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bandeja Unificada Tab */}
      {activeTab === 'unified-inbox' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Bandeja Unificada
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Todos los mensajes en un solo lugar - Chat, Contacto y Tickets
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setUnifiedFilter(prev => ({ ...prev, unreadOnly: !prev.unreadOnly }))}
                className={unifiedFilter.unreadOnly ? "btn btn-primary" : "btn btn-secondary"}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Bell size={18} />
                {unifiedFilter.unreadOnly ? 'Mostrar Todos' : 'Solo No Leídos'}
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Tipo
                </label>
                <select
                  value={unifiedFilter.type}
                  onChange={(e) => setUnifiedFilter(prev => ({ ...prev, type: e.target.value as UnifiedMessageType | 'all' }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="chat">💬 Chat</option>
                  <option value="contact">📧 Contacto</option>
                  <option value="ticket">🎫 Ticket</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Prioridad
                </label>
                <select
                  value={unifiedFilter.priority}
                  onChange={(e) => setUnifiedFilter(prev => ({ ...prev, priority: e.target.value as UnifiedMessagePriority | 'all' }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="high">🔴 Alta</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Estado
                </label>
                <select
                  value={unifiedFilter.status}
                  onChange={(e) => setUnifiedFilter(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="open">⚪ Abierto</option>
                  <option value="closed">🔴 Cerrado</option>
                  <option value="visto">Visto</option>
                  <option value="revision">En Revisión</option>
                  <option value="resuelto">Resuelto</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Buscar
                </label>
                <input
                  type="text"
                  placeholder="Buscar por usuario, contenido..."
                  value={unifiedFilter.search}
                  onChange={(e) => setUnifiedFilter(prev => ({ ...prev, search: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas - Grid compacto en móvil (igual que pedidos) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.5rem' : '1rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <MessageSquare size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Chat</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>{unifiedUnreadCounts.chat}</div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>no leídos</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Mail size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Contacto</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>{unifiedUnreadCounts.contact}</div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>no leídos</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <TicketIcon size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Ticket</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>{unifiedUnreadCounts.ticket}</div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>no leídos</div>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              padding: isMobile ? '0.625rem' : '1.5rem',
              borderRadius: isMobile ? '0.75rem' : '1rem',
              color: 'white',
              aspectRatio: isMobile ? '1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <Bell size={isMobile ? 16 : 24} style={{ marginBottom: isMobile ? '0.25rem' : '0.75rem', flexShrink: 0 }} />
              <span style={{ 
                fontSize: isMobile ? '0.625rem' : '0.875rem', 
                opacity: 0.9, 
                marginBottom: isMobile ? '0.25rem' : '0.5rem',
                lineHeight: '1.2',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}>Total</span>
              <div style={{ fontSize: isMobile ? '1.125rem' : '2rem', fontWeight: 700, lineHeight: '1' }}>{totalUnreadUnified}</div>
              <div style={{ fontSize: isMobile ? '0.625rem' : '0.75rem', opacity: 0.8, marginTop: isMobile ? '0.25rem' : '0.5rem' }}>no leídos</div>
            </div>
          </div>

          {/* Lista de mensajes unificados */}
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: isMobile ? '0.75rem' : '1rem',
            maxHeight: isMobile ? 'none' : 'calc(100vh - 500px)',
            overflowY: 'auto'
          }}>
            {filterUnifiedMessages(unifiedMessages, unifiedFilter).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                <Mail size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                <p>No hay mensajes que coincidan con los filtros</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filterUnifiedMessages(unifiedMessages, unifiedFilter).map((msg) => {
                  const typeBadge = getTypeBadge(msg.type);
                  const priorityBadge = getPriorityBadge(msg.priority);
                  const isSelected = selectedUnifiedMessage?.id === msg.id;
                  
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedUnifiedMessage(msg)}
                      style={{
                        padding: isMobile ? '1rem' : '1.25rem',
                        background: isSelected ? 'var(--primary)' : (msg.read ? 'var(--bg-primary)' : 'var(--bg-tertiary)'),
                        color: isSelected ? 'white' : 'var(--text-primary)',
                        borderRadius: '0.75rem',
                        border: `2px solid ${isSelected ? 'var(--primary)' : (msg.read ? 'var(--border)' : priorityBadge.color)}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: typeBadge.color,
                              color: 'white'
                            }}>
                              {typeBadge.label}
                            </span>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: priorityBadge.color,
                              color: 'white'
                            }}>
                              {priorityBadge.label}
                            </span>
                            {msg.status && (
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: msg.status === 'open' ? '#10B981' : msg.status === 'closed' ? '#EF4444' : 'var(--bg-secondary)',
                                color: 'white'
                              }}>
                                {msg.status === 'open' ? '⚪ Abierto' : msg.status === 'closed' ? '🔴 Cerrado' : msg.status}
                              </span>
                            )}
                            {!msg.read && (
                              <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'var(--error)',
                                display: 'inline-block'
                              }} />
                            )}
                          </div>
                          <h3 style={{ 
                            margin: 0, 
                            marginBottom: '0.5rem', 
                            fontSize: isMobile ? '1rem' : '1.125rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {msg.username}
                          </h3>
                          {msg.subject && (
                            <p style={{ 
                              margin: '0 0 0.5rem 0', 
                              fontSize: '0.875rem', 
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {msg.subject}
                            </p>
                          )}
                          <p style={{ 
                            margin: 0, 
                            fontSize: '0.875rem', 
                            opacity: 0.8,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {msg.content}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
                          {formatTimeAgo(msg.createdAt)}
                        </div>
                      </div>
                      {msg.userEmail && (
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.5rem' }}>
                          📧 {msg.userEmail}
                          {msg.userPhone && ` • 📱 ${msg.userPhone}`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detalle del mensaje seleccionado */}
          {selectedUnifiedMessage && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: isMobile ? '1rem' : '2rem'
            }}
            onClick={() => setSelectedUnifiedMessage(null)}
            >
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border)'
              }}
              onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  padding: '1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, var(--primary), #d65a00)',
                  color: 'white'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                      {selectedUnifiedMessage.username}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {getTypeBadge(selectedUnifiedMessage.type).label}
                      {getPriorityBadge(selectedUnifiedMessage.priority).label}
                      {selectedUnifiedMessage.status && (
                        <span>{selectedUnifiedMessage.status === 'open' ? '⚪ Abierto' : selectedUnifiedMessage.status === 'closed' ? '🔴 Cerrado' : selectedUnifiedMessage.status}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUnifiedMessage(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <XCircle size={24} />
                  </button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {selectedUnifiedMessage.subject && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Asunto:</strong>
                      <p style={{ color: 'var(--text-secondary)' }}>{selectedUnifiedMessage.subject}</p>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Mensaje:</strong>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedUnifiedMessage.content}
                    </p>
                  </div>
                  {selectedUnifiedMessage.userEmail && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <strong>Email:</strong> {selectedUnifiedMessage.userEmail}
                      {selectedUnifiedMessage.userPhone && (
                        <>
                          <br />
                          <strong>Teléfono:</strong> {selectedUnifiedMessage.userPhone}
                        </>
                      )}
                    </div>
                  )}
                  {selectedUnifiedMessage.ticketNumber && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <strong>Ticket:</strong> {selectedUnifiedMessage.ticketNumber}
                    </div>
                  )}
                  {selectedUnifiedMessage.metadata?.adminResponse && (
                    <div style={{
                      background: 'var(--bg-secondary)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      marginTop: '1rem'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Respuesta del Admin:</strong>
                      <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {selectedUnifiedMessage.metadata.adminResponse}
                      </p>
                    </div>
                  )}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Recibido: {selectedUnifiedMessage.createdAt.toLocaleString('es-AR')}
                    </div>
                  </div>
                  {/* Botones de acción según el tipo */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    {selectedUnifiedMessage.type === 'chat' && (
                      <button
                        onClick={() => {
                          setSelectedUnifiedMessage(null);
                          setSelectedConversation(selectedUnifiedMessage.conversationId || null);
                          setActiveTab('messages');
                        }}
                        className="btn btn-primary"
                      >
                        Abrir Conversación
                      </button>
                    )}
                    {selectedUnifiedMessage.type === 'ticket' && (
                      <button
                        onClick={() => {
                          setSelectedUnifiedMessage(null);
                          const ticket = tickets.find(t => t.id === selectedUnifiedMessage.id.replace('ticket_', ''));
                          if (ticket) {
                            setSelectedTicket(ticket);
                            setActiveTab('tickets');
                          }
                        }}
                        className="btn btn-primary"
                      >
                        Ver Ticket
                      </button>
                    )}
                    {selectedUnifiedMessage.type === 'contact' && (
                      <button
                        onClick={async () => {
                          try {
                            await markContactMessageAsRead(selectedUnifiedMessage.id.replace('contact_', ''));
                            setSelectedUnifiedMessage({ ...selectedUnifiedMessage, read: true });
                          } catch (error) {
                            alert('❌ Error al marcar como leído');
                          }
                        }}
                        className="btn btn-secondary"
                        disabled={selectedUnifiedMessage.read}
                      >
                        {selectedUnifiedMessage.read ? 'Leído' : 'Marcar como Leído'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensajería Tab - Mejorado */}
      {activeTab === 'messages' && (
        <div className={isMobile ? 'chat-management-mobile' : ''} style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem', 
          height: isMobile ? 'auto' : 'calc(100vh - 300px)', 
          minHeight: isMobile ? 'auto' : '500px' 
        }}>
          {/* Lista de Conversaciones */}
          <div className={isMobile ? 'chat-conversations-list-mobile' : ''} style={{
            width: isMobile ? '100%' : '300px',
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            padding: isMobile ? '0.75rem' : '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
            maxHeight: isMobile ? '300px' : 'none'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                Conversaciones {adminUnreadCount > 0 && (
                  <span style={{
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    marginLeft: '0.5rem'
                  }}>
                    {adminUnreadCount}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Plus size={16} />
                {isMobile ? 'Nuevo' : 'Nuevo Mensaje'}
              </button>
            </div>

            {/* Selector de Usuario para Nuevo Mensaje */}
            {showUserSelector && (
              <div style={{
                padding: '1rem',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                marginBottom: '1rem'
              }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}>
                  Seleccionar Usuario:
                </label>
                {loadingUsers ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Cargando usuarios...
                  </div>
                ) : (
                  <select
                    value={selectedUserForMessage || ''}
                    onChange={(e) => setSelectedUserForMessage(e.target.value || null)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      marginBottom: '0.5rem'
                    }}
                  >
                    <option value="">-- Seleccionar usuario --</option>
                    {realUsers.length === 0 ? (
                      <option value="" disabled>No hay usuarios disponibles</option>
                    ) : (
                      realUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.username || u.displayName || u.email?.split('@')[0] || `Usuario ${u.id.slice(0, 8)}`}
                        </option>
                      ))
                    )}
                  </select>
                )}
                {selectedUserForMessage && (
                  <button
                    onClick={() => {
                      setShowUserSelector(false);
                      setSelectedConversation(`admin_${selectedUserForMessage}`);
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                  >
                    <Send size={16} style={{ marginRight: '0.5rem' }} />
                    Abrir Conversación
                  </button>
                )}
              </div>
            )}

            {conversations.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                No hay conversaciones
              </p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    if (isMobile) {
                      // En móvil, mostrar mensajes debajo
                      setShowUserSelector(false);
                    }
                  }}
                  style={{
                    padding: isMobile ? '0.75rem' : '1rem',
                    background: selectedConversation === conv.id ? 'var(--primary)' : 'var(--bg-primary)',
                    color: selectedConversation === conv.id ? 'white' : 'var(--text-primary)',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    border: `1px solid ${selectedConversation === conv.id ? 'var(--primary)' : 'var(--border)'}`,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: isMobile ? '0.875rem' : '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.username}
                      </p>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: isMobile ? '0.75rem' : '0.875rem', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.lastMessage?.content?.substring(0, isMobile ? 20 : 30) || 'Sin mensajes'}...
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span style={{
                        background: selectedConversation === conv.id ? 'white' : 'var(--error)',
                        color: selectedConversation === conv.id ? 'var(--primary)' : 'white',
                        borderRadius: '50%',
                        width: isMobile ? '20px' : '24px',
                        height: isMobile ? '20px' : '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Panel de Mensajes - Responsive */}
          <div style={{
            flex: 1,
            background: 'var(--bg-secondary)',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: isMobile ? '400px' : 'auto'
          }}>
            {selectedConversation || selectedUserForMessage ? (
              <>
                <div style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                      {selectedConversation 
                        ? conversations.find(c => c.id === selectedConversation)?.username || 'Usuario'
                        : realUsers.find((u: any) => u.id === selectedUserForMessage)?.username || 'Usuario'
                      }
                    </h3>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: conversationStatus === 'open' ? '#10B981' : 'var(--text-secondary)',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>●</span>
                      {conversationStatus === 'open' ? 'Conversación abierta' : 'Conversación cerrada'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {selectedConversation && (
                      <>
                        {conversationStatus === 'open' ? (
                          <button
                            onClick={handleCloseConversation}
                            disabled={closingConversation}
                            className="btn btn-outline"
                            style={{ 
                              padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              whiteSpace: 'nowrap'
                            }}
                            title="Cerrar conversación"
                          >
                            <XCircle size={16} />
                            {!isMobile && 'Cerrar'}
                          </button>
                        ) : (
                          <button
                            onClick={handleReopenConversation}
                            disabled={closingConversation}
                            className="btn btn-primary"
                            style={{ 
                              padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                              fontSize: isMobile ? '0.75rem' : '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              whiteSpace: 'nowrap'
                            }}
                            title="Reabrir conversación"
                          >
                            <CheckCircle size={16} />
                            {!isMobile && 'Reabrir'}
                          </button>
                        )}
                      </>
                    )}
                    {selectedConversation && (
                      <button
                        onClick={async () => {
                          if (window.confirm('¿Eliminar esta conversación completa?')) {
                            await deleteConversation(selectedConversation);
                            setSelectedConversation(null);
                            // Las conversaciones se actualizarán automáticamente por el listener
                          }
                        }}
                        className="btn btn-danger"
                        style={{ 
                          padding: isMobile ? '0.5rem' : '0.5rem 0.75rem',
                          fontSize: isMobile ? '0.875rem' : '0.9375rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                        title="Eliminar conversación"
                      >
                        <Trash2 size={16} />
                        {!isMobile && 'Eliminar'}
                      </button>
                    )}
                  </div>
                </div>
                <div 
                  id="admin-messages-container"
                  style={{
                    flex: 1,
                    padding: isMobile ? '0.75rem' : '1rem',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    minHeight: '200px',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {conversationMessages.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                      No hay mensajes en esta conversación
                    </p>
                  ) : (
                    conversationMessages.map(msg => {
                      const isAdmin = msg.fromUserId === 'admin';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                            maxWidth: isMobile ? '85%' : '70%',
                            position: 'relative'
                          }}
                        >
                          <div style={{
                            padding: isMobile ? '0.625rem 0.875rem' : '0.75rem 1rem',
                            background: isAdmin ? 'var(--primary)' : 'var(--bg-primary)',
                            color: isAdmin ? 'white' : 'var(--text-primary)',
                            borderRadius: '1rem',
                            border: `1px solid ${isAdmin ? 'var(--primary)' : 'var(--border)'}`,
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontSize: isMobile ? '0.8125rem' : '0.875rem', fontWeight: 600 }}>
                                  {isAdmin ? 'Administrador' : msg.fromUsername}
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: isMobile ? '0.875rem' : '0.9375rem', wordBreak: 'break-word' }}>
                                  {msg.content}
                                </p>
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: isMobile ? '0.7rem' : '0.75rem', opacity: 0.7 }}>
                                  {formatTimeAgo(msg.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={async () => {
                                  if (window.confirm('¿Eliminar este mensaje?')) {
                                    const convId = selectedConversation || `admin_${selectedUserForMessage}`;
                                    await deleteMessage(convId, msg.id);
                                    // Los mensajes se actualizarán automáticamente por el listener
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isAdmin ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.6,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                                title="Eliminar mensaje"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div style={{
                  padding: isMobile ? '0.75rem' : '1rem',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <label style={{ 
                      fontSize: '0.875rem', 
                      color: 'var(--text-secondary)', 
                      fontWeight: 600 
                    }}>
                      Escribí tu respuesta:
                    </label>
                    <textarea
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={conversationStatus === 'closed' ? 'Esta conversación está cerrada. Reabrila para enviar mensajes.' : "Escribí tu mensaje aquí... (Ctrl+Enter para enviar)"}
                      disabled={conversationStatus === 'closed'}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: isMobile ? '0.75rem' : '0.875rem 1rem',
                        borderRadius: '0.75rem',
                        border: '2px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '0.9375rem',
                        resize: 'vertical',
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        lineHeight: '1.5'
                      }}
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <span>
                        {newMessageContent.length > 0 && `${newMessageContent.length} caracteres`}
                      </span>
                      <span>Ctrl+Enter para enviar</span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={handleSendMessage}
                      className="btn btn-primary"
                      disabled={!newMessageContent.trim() || (!selectedConversation && !selectedUserForMessage) || conversationStatus === 'closed'}
                      style={{ 
                        padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.5rem',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                        minWidth: '120px',
                        justifyContent: 'center'
                      }}
                    >
                      <Send size={isMobile ? 18 : 20} />
                      Enviar Mensaje
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <div>
                  <Mail size={isMobile ? 48 : 64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: isMobile ? '0.875rem' : '1rem', margin: 0 }}>
                    {isMobile ? 'Tocá una conversación' : 'Seleccioná una conversación'} para ver los mensajes
                  </p>
                  {!showUserSelector && (
                    <button
                      onClick={() => setShowUserSelector(true)}
                      className="btn btn-primary"
                      style={{ 
                        marginTop: '1rem',
                        padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.25rem',
                        fontSize: isMobile ? '0.875rem' : '0.9375rem'
                      }}
                    >
                      <Plus size={16} style={{ marginRight: '0.5rem' }} />
                      Nuevo Mensaje
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor de Home Tab */}
      {activeTab === 'home-config' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Editor de Página de Inicio
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Personalizá completamente tu sitio: logo, colores, títulos, secciones y más
              </p>
            </div>
            <button
              onClick={handleSaveHomeConfig}
              className="btn btn-primary"
              style={{ 
                padding: isMobile ? '0.75rem 1.25rem' : '0.875rem 1.5rem',
                fontSize: isMobile ? '0.875rem' : '0.9375rem'
              }}
            >
              <Save size={18} style={{ marginRight: '0.5rem' }} />
              Guardar Todo
            </button>
          </div>

          {/* Sección Logo y Configuración del Sitio */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ImageIcon size={24} />
              Logo y Configuración del Sitio
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Nombre del Sitio *
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.siteName || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      siteName: e.target.value 
                    } 
                  })}
                  placeholder="Ej: Clikio"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Tagline (Eslogan)
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.siteTagline || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      siteTagline: e.target.value 
                    } 
                  })}
                  placeholder="Ej: La plataforma líder de subastas online"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              {/* Opciones de Logo - Usando LogoManager */}
              <div>
                <LogoManager
                  currentLogoUrl={homeConfig.siteSettings?.logoUrl || ''}
                  currentLogoConfig={homeConfig.siteSettings?.logoConfig}
                  onLogoChange={(url) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      logoUrl: url 
                    } 
                  })}
                  onConfigChange={(config) => {
                    // Guardar configuración del logo en siteSettings
                    setHomeConfig({ 
                      ...homeConfig, 
                      siteSettings: { 
                        ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings),
                        logoConfig: {
                          ...(homeConfig.siteSettings?.logoConfig || {}),
                          ...config
                        }
                      } 
                    });
                  }}
                  theme={theme || 'light'}
                />
              </div>
              
              {/* Logos por Tema */}
              <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                <h4 style={{ margin: 0, marginBottom: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎨 Logos por Tema (Opcional)
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Subí logos diferentes para cada modo (Claro, Oscuro, Experimental). Si no subís logos por tema, se usará el logo único de arriba.
                </p>
                
                {(['light', 'dark', 'experimental'] as const).map((themeMode) => {
                  const themeLabels = {
                    light: { label: 'Modo Claro', icon: '☀️' },
                    dark: { label: 'Modo Oscuro', icon: '🌙' },
                    experimental: { label: 'Modo Experimental', icon: '✨' }
                  };
                  const currentLogoUrl = homeConfig.siteSettings?.logoUrls?.[themeMode] || '';
                  
                  return (
                    <div key={themeMode} style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                      <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9375rem' }}>
                        {themeLabels[themeMode].icon} {themeLabels[themeMode].label}
                      </label>
                      
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.background = 'var(--bg-primary)';
                        }}
                        onDrop={(e) => handleImageDrop(e, (url) => {
                          const currentLogoUrls = homeConfig.siteSettings?.logoUrls || {};
                          setHomeConfig({ 
                            ...homeConfig, 
                            siteSettings: { 
                              ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                              logoUrls: {
                                ...currentLogoUrls,
                                [themeMode]: url
                              }
                            } 
                          });
                        }, true, 'logo')}
                        style={{
                          border: '2px dashed var(--border)',
                          borderRadius: '0.5rem',
                          padding: '0.75rem',
                          background: 'var(--bg-primary)',
                          transition: 'all 0.2s',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileSelect(e, (url) => {
                            const currentLogoUrls = homeConfig.siteSettings?.logoUrls || {};
                            setHomeConfig({ 
                              ...homeConfig, 
                              siteSettings: { 
                                ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                                logoUrls: {
                                  ...currentLogoUrls,
                                  [themeMode]: url
                                }
                              } 
                            });
                          }, true, 'logo')}
                          style={{ display: 'none' }}
                          id={`logo-${themeMode}-input`}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <label
                            htmlFor={`logo-${themeMode}-input`}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              display: 'inline-block'
                            }}
                          >
                            {currentLogoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                          </label>
                        </div>
                      </div>
                      
                      <input
                        type="text"
                        value={currentLogoUrl}
                        onChange={(e) => {
                          const currentLogoUrls = homeConfig.siteSettings?.logoUrls || {};
                          setHomeConfig({ 
                            ...homeConfig, 
                            siteSettings: { 
                              ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                              logoUrls: {
                                ...currentLogoUrls,
                                [themeMode]: e.target.value
                              }
                            } 
                          });
                        }}
                        placeholder={`URL del logo para ${themeLabels[themeMode].label}`}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: isMobile ? '16px' : '0.9375rem',
                          marginBottom: '0.5rem'
                        }}
                      />
                      
                      {currentLogoUrl && (
                        <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', padding: '0.75rem', background: 'var(--bg-primary)' }}>
                          <img 
                            src={currentLogoUrl} 
                            alt={`Logo ${themeLabels[themeMode].label}`}
                            style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Texto del Footer
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.footerText || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      footerText: e.target.value 
                    } 
                  })}
                  placeholder="Ej: © 2024 Clikio. Todos los derechos reservados."
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
            </div>

            {/* Catálogo de Stickers - Usando StickerManager */}
            <div style={{
              background: 'var(--bg-secondary)',
              padding: isMobile ? '1rem' : '2rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              marginTop: '2rem',
              overflow: 'hidden'
            }}>
              <StickerManager
                stickers={homeConfig.siteSettings?.logoStickers || []}
                onStickersChange={(stickers) => setHomeConfig({
                  ...homeConfig,
                  siteSettings: {
                    ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings),
                    logoStickers: stickers
                  }
                })}
              />
            </div>
          </div>

          {/* Sección Colores del Tema */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🎨</span>
              Colores del Tema (por Modo)
            </h3>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Configurá los colores para cada modo (Claro, Oscuro, Experimental). Los cambios se aplican automáticamente en tiempo real.
              </p>
            </div>

            {(() => {
              const themeColorSets = homeConfig.themeColorSets || defaultHomeConfig.themeColorSets;
              const modeLabels = {
                light: { label: 'Modo Claro', icon: '☀️' },
                dark: { label: 'Modo Oscuro', icon: '🌙' },
                experimental: { label: 'Modo Experimental', icon: '✨' }
              };

              return (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(Object.keys(modeLabels) as Array<'light' | 'dark' | 'experimental'>).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setActiveColorMode(mode)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          border: `2px solid ${activeColorMode === mode ? 'var(--primary)' : 'var(--border)'}`,
                          background: activeColorMode === mode ? 'var(--primary)' : 'var(--bg-primary)',
                          color: activeColorMode === mode ? 'white' : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.9375rem',
                          fontWeight: activeColorMode === mode ? 600 : 400,
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span>{modeLabels[mode].icon}</span>
                        <span>{modeLabels[mode].label}</span>
                      </button>
                    ))}
                    {activeColorMode === 'experimental' && (
                      <button
                        onClick={() => {
                          const newColors = generateComplementaryColors();
                          const newColorSets = {
                            ...themeColorSets,
                            experimental: newColors
                          };
                          setHomeConfig({ 
                            ...homeConfig, 
                            themeColorSets: newColorSets
                          });
                        }}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.5rem',
                          border: '2px solid var(--primary)',
                          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9375rem',
                          fontWeight: 600,
                          transition: 'all 0.3s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          marginLeft: 'auto'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        title="Generar paleta de colores complementarios aleatorios"
                      >
                        <Shuffle size={18} />
                        <span>Colores Aleatorios</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
                    {Object.entries(themeColorSets[activeColorMode]).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        transition: 'all 0.2s'
                      }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize', fontSize: '0.9375rem' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => {
                              const newColorSets = {
                                ...themeColorSets,
                                [activeColorMode]: {
                                  ...themeColorSets[activeColorMode],
                                  [key]: e.target.value
                                }
                              };
                              setHomeConfig({ 
                                ...homeConfig, 
                                themeColorSets: newColorSets
                              });
                            }}
                            style={{
                              width: '60px',
                              height: '40px',
                              border: '1px solid var(--border)',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                              transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              (e.target as HTMLInputElement).style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              (e.target as HTMLInputElement).style.transform = 'scale(1)';
                            }}
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(newValue) || newValue === '') {
                                const newColorSets = {
                                  ...themeColorSets,
                                  [activeColorMode]: {
                                    ...themeColorSets[activeColorMode],
                                    [key]: newValue
                                  }
                                };
                                setHomeConfig({ 
                                  ...homeConfig, 
                                  themeColorSets: newColorSets
                                });
                              }
                            }}
                            placeholder="#000000"
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '1rem',
                              fontFamily: 'monospace'
                            }}
                          />
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '0.5rem',
                            background: value,
                            border: '1px solid var(--border)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }} title="Vista previa" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
            <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
                💡 Tip: Los colores se aplican globalmente a:
              </div>
              <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                <li>Botones y enlaces</li>
                <li>Fondos y bordes</li>
                <li>Textos y títulos</li>
                <li>Elementos de navegación</li>
                <li>Todos los componentes de la web</li>
              </ul>
            </div>
          </div>

          {/* Sección Títulos de Secciones */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📝</span>
              Títulos de Secciones
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
              {Object.entries(homeConfig.sectionTitles || defaultHomeConfig.sectionTitles).map(([key, value]) => (
                <div key={key}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      sectionTitles: { 
                        ...(homeConfig.sectionTitles || defaultHomeConfig.sectionTitles), 
                        [key]: e.target.value 
                      } 
                    })}
                    placeholder={`Título para ${key}`}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sección Hero */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ImageIcon size={24} />
              Sección Principal (Hero)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Título Principal *
                </label>
                <input
                  type="text"
                  value={homeConfig.heroTitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroTitle: e.target.value })}
                  placeholder="Ej: Bienvenido a Clikio"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Subtítulo *
                </label>
                <textarea
                  value={homeConfig.heroSubtitle}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroSubtitle: e.target.value })}
                  rows={4}
                  placeholder="Descripción breve de tu plataforma..."
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Imagen Principal
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                  onDrop={(e) => handleImageDrop(e, (url) => setHomeConfig({ ...homeConfig, heroImageUrl: url }), false, 'images', true)}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    background: 'var(--bg-primary)',
                    transition: 'all 0.2s',
                    marginBottom: '0.75rem'
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,video/*,.gif"
                    onChange={(e) => handleImageFileSelect(e, (url) => setHomeConfig({ ...homeConfig, heroImageUrl: url }), false, 'images', true)}
                    style={{ display: 'none' }}
                    id="hero-image-input"
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      📸🎬 Arrastrá una imagen, GIF animado o video aquí o hacé clic para seleccionar
                    </div>
                    <label
                      htmlFor="hero-image-input"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.625rem 1.25rem',
                        fontSize: isMobile ? '0.875rem' : '0.9375rem',
                        cursor: 'pointer',
                        display: 'inline-block'
                      }}
                    >
                      Seleccionar Archivo
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      También podés pegar una URL abajo (imágenes, GIFs animados o videos)
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={homeConfig.heroImageUrl}
                  onChange={(e) => setHomeConfig({ ...homeConfig, heroImageUrl: e.target.value })}
                  placeholder="O ingresá una URL: https://ejemplo.com/imagen.jpg"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem',
                    marginBottom: '0.75rem'
                  }}
                />
                {homeConfig.heroImageUrl && (
                  <div style={{ marginTop: '0.75rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img 
                      src={homeConfig.heroImageUrl} 
                      alt="Preview" 
                      style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor de Estadísticas del Header */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <TrendingUp size={24} />
              Estadísticas del Header
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Personalizá los números que se muestran en la sección principal. Dejá vacío para usar los valores automáticos.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Subastas Activas
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.heroStats?.auctions || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      heroStats: {
                        ...(homeConfig.siteSettings?.heroStats || {}),
                        auctions: e.target.value
                      }
                    } 
                  })}
                  placeholder="Ej: 2 (dejar vacío para usar valor automático)"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Productos en Tienda
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.heroStats?.products || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      heroStats: {
                        ...(homeConfig.siteSettings?.heroStats || {}),
                        products: e.target.value
                      }
                    } 
                  })}
                  placeholder="Ej: 3 (dejar vacío para usar valor automático)"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  Usuarios Activos
                </label>
                <input
                  type="text"
                  value={homeConfig.siteSettings?.heroStats?.users || ''}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    siteSettings: { 
                      ...(homeConfig.siteSettings || defaultHomeConfig.siteSettings), 
                      heroStats: {
                        ...(homeConfig.siteSettings?.heroStats || {}),
                        users: e.target.value
                      }
                    } 
                  })}
                  placeholder="Ej: 1000+ (dejar vacío para usar valor automático)"
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: isMobile ? '16px' : '1rem'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Sección Banners */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ImageIcon size={24} />
                Banners ({homeConfig.banners.length})
              </h3>
              <button
                onClick={handleAddBanner}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                Agregar Banner
              </button>
            </div>
            
            {homeConfig.banners.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border)'
              }}>
                <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No hay banners creados. Agregá uno para comenzar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {homeConfig.banners.map((banner, index) => (
                  <div 
                    key={banner.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => handleUpdateBanner(banner.id, { title: e.target.value })}
                          placeholder="Título del banner"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '1rem',
                            marginBottom: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                        <textarea
                          value={banner.description || ''}
                          onChange={(e) => handleUpdateBanner(banner.id, { description: e.target.value })}
                          placeholder="Descripción (opcional)"
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '0.9375rem',
                            marginBottom: '0.75rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                            Imagen del Banner
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onDrop={(e) => handleImageDrop(e, (url) => handleUpdateBanner(banner.id, { imageUrl: url }))}
                            style={{
                              border: '2px dashed var(--border)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-primary)',
                              transition: 'all 0.2s',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileSelect(e, (url) => handleUpdateBanner(banner.id, { imageUrl: url }))}
                              style={{ display: 'none' }}
                              id={`banner-image-input-${banner.id}`}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                📸 Arrastrá imagen o seleccioná
                              </div>
                              <label
                                htmlFor={`banner-image-input-${banner.id}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                  cursor: 'pointer',
                                  display: 'inline-block'
                                }}
                              >
                                Seleccionar
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={banner.imageUrl}
                            onChange={(e) => handleUpdateBanner(banner.id, { imageUrl: e.target.value })}
                            placeholder="O ingresá una URL de imagen"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <input
                            type="text"
                            value={banner.link || ''}
                            onChange={(e) => handleUpdateBanner(banner.id, { link: e.target.value })}
                            placeholder="Link (opcional)"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                          <input
                            type="text"
                            value={banner.linkText || 'Ver más'}
                            onChange={(e) => handleUpdateBanner(banner.id, { linkText: e.target.value })}
                            placeholder="Texto del botón"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={banner.active}
                              onChange={(e) => handleUpdateBanner(banner.id, { active: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activo</span>
                          </label>
                          <input
                            type="number"
                            value={banner.order}
                            onChange={(e) => handleUpdateBanner(banner.id, { order: Number(e.target.value) })}
                            placeholder="Orden"
                            min="0"
                            style={{
                              width: '100px',
                              padding: '0.5rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Orden de visualización</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '0.5rem',
                          alignSelf: 'flex-start'
                        }}
                        title="Eliminar banner"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {banner.imageUrl && (
                      <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.title}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección Promociones */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={24} />
                Promociones ({homeConfig.promotions.length})
              </h3>
              <button
                onClick={handleAddPromotion}
                className="btn btn-primary"
                style={{ 
                  padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.25rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                Agregar Promoción
              </button>
            </div>
            
            {homeConfig.promotions.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                borderRadius: '0.5rem',
                border: '1px dashed var(--border)'
              }}>
                <TrendingUp size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No hay promociones creadas. Agregá una para comenzar.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {homeConfig.promotions.map((promo) => (
                  <div 
                    key={promo.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          value={promo.title}
                          onChange={(e) => handleUpdatePromotion(promo.id, { title: e.target.value })}
                          placeholder="Título de la promoción"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '1rem',
                            marginBottom: '0.75rem',
                            fontWeight: 600
                          }}
                        />
                        <textarea
                          value={promo.description}
                          onChange={(e) => handleUpdatePromotion(promo.id, { description: e.target.value })}
                          placeholder="Descripción de la promoción"
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontSize: isMobile ? '16px' : '0.9375rem',
                            marginBottom: '0.75rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                            Imagen de la Promoción
                          </label>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.background = 'rgba(214, 90, 0, 0.05)';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.background = 'var(--bg-primary)';
                            }}
                            onDrop={(e) => handleImageDrop(e, (url) => handleUpdatePromotion(promo.id, { imageUrl: url }))}
                            style={{
                              border: '2px dashed var(--border)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-primary)',
                              transition: 'all 0.2s',
                              marginBottom: '0.5rem'
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageFileSelect(e, (url) => handleUpdatePromotion(promo.id, { imageUrl: url }))}
                              style={{ display: 'none' }}
                              id={`promo-image-input-${promo.id}`}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                📸 Arrastrá imagen o seleccioná
                              </div>
                              <label
                                htmlFor={`promo-image-input-${promo.id}`}
                                className="btn btn-secondary"
                                style={{
                                  padding: '0.5rem 1rem',
                                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                                  cursor: 'pointer',
                                  display: 'inline-block'
                                }}
                              >
                                Seleccionar
                              </label>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={promo.imageUrl}
                            onChange={(e) => handleUpdatePromotion(promo.id, { imageUrl: e.target.value })}
                            placeholder="O ingresá una URL de imagen"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <input
                            type="text"
                            value={promo.link || ''}
                            onChange={(e) => handleUpdatePromotion(promo.id, { link: e.target.value })}
                            placeholder="Link (opcional)"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: isMobile ? 'block' : 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              value={promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleUpdatePromotion(promo.id, { startDate: e.target.value ? new Date(e.target.value) : undefined })}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '16px' : '0.9375rem'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                              Fecha de fin
                            </label>
                            <input
                              type="date"
                              value={promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => handleUpdatePromotion(promo.id, { endDate: e.target.value ? new Date(e.target.value) : undefined })}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: isMobile ? '16px' : '0.9375rem'
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input
                              type="checkbox"
                              checked={promo.active}
                              onChange={(e) => handleUpdatePromotion(promo.id, { active: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activa</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePromotion(promo.id)}
                        className="btn btn-danger"
                        style={{ 
                          padding: '0.5rem',
                          alignSelf: 'flex-start'
                        }}
                        title="Eliminar promoción"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {promo.imageUrl && (
                      <div style={{ marginTop: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img 
                          src={promo.imageUrl} 
                          alt={promo.title}
                          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección Sobre Nosotros */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
                Sección Sobre Nosotros
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={homeConfig.aboutSection?.active || false}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    aboutSection: { 
                      ...(homeConfig.aboutSection || defaultHomeConfig.aboutSection), 
                      active: e.target.checked 
                    } 
                  })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activar sección</span>
              </label>
            </div>
            {homeConfig.aboutSection?.active && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={homeConfig.aboutSection?.title || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      aboutSection: { 
                        ...(homeConfig.aboutSection || defaultHomeConfig.aboutSection), 
                        title: e.target.value 
                      } 
                    })}
                    placeholder="Sobre Nosotros"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Contenido
                  </label>
                  <textarea
                    value={homeConfig.aboutSection?.content || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      aboutSection: { 
                        ...(homeConfig.aboutSection || defaultHomeConfig.aboutSection), 
                        content: e.target.value 
                      } 
                    })}
                    rows={6}
                    placeholder="Descripción de tu empresa o plataforma..."
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Imagen (opcional)
                  </label>
                  <input
                    type="text"
                    value={homeConfig.aboutSection?.imageUrl || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      aboutSection: { 
                        ...(homeConfig.aboutSection || defaultHomeConfig.aboutSection), 
                        imageUrl: e.target.value 
                      } 
                    })}
                    placeholder="URL de imagen (opcional)"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sección Contacto */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>📧</span>
                Sección Contacto
              </h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={homeConfig.contactSection?.active || false}
                  onChange={(e) => setHomeConfig({ 
                    ...homeConfig, 
                    contactSection: { 
                      ...(homeConfig.contactSection || defaultHomeConfig.contactSection), 
                      active: e.target.checked 
                    } 
                  })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>Activar sección</span>
              </label>
            </div>
            {homeConfig.contactSection?.active && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Título
                  </label>
                  <input
                    type="text"
                    value={homeConfig.contactSection?.title || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      contactSection: { 
                        ...(homeConfig.contactSection || defaultHomeConfig.contactSection), 
                        title: e.target.value 
                      } 
                    })}
                    placeholder="Contacto"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    value={homeConfig.contactSection?.email || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      contactSection: { 
                        ...(homeConfig.contactSection || defaultHomeConfig.contactSection), 
                        email: e.target.value 
                      } 
                    })}
                    placeholder="contacto@ejemplo.com"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Teléfono (opcional)
                  </label>
                  <input
                    type="text"
                    value={homeConfig.contactSection?.phone || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      contactSection: { 
                        ...(homeConfig.contactSection || defaultHomeConfig.contactSection), 
                        phone: e.target.value 
                      } 
                    })}
                    placeholder="+54 11 1234-5678"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Dirección (opcional)
                  </label>
                  <input
                    type="text"
                    value={homeConfig.contactSection?.address || ''}
                    onChange={(e) => setHomeConfig({ 
                      ...homeConfig, 
                      contactSection: { 
                        ...(homeConfig.contactSection || defaultHomeConfig.contactSection), 
                        address: e.target.value 
                      } 
                    })}
                    placeholder="Calle, Ciudad, País"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: isMobile ? '16px' : '1rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === 'tickets' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Centro de Ayuda
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Gestioná tickets y mensajes de contacto
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row' }}>
            {/* Lista de Tickets */}
            <div style={{ 
              flex: isMobile ? '1' : '1', 
              background: 'var(--bg-secondary)', 
              borderRadius: '0.75rem', 
              padding: '1.5rem',
              maxHeight: isMobile ? 'none' : 'calc(100vh - 300px)',
              overflowY: 'auto'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Tickets ({tickets.length})</h3>
                  <button
                    onClick={async () => {
                      if (!confirm('⚠️ ¿Estás seguro de que querés eliminar TODOS los tickets? Esta acción no se puede deshacer.')) {
                        return;
                      }
                      if (!confirm('⚠️ ÚLTIMA ADVERTENCIA: Se eliminarán TODOS los tickets. ¿Continuar?')) {
                        return;
                      }
                      try {
                        const ticketsRef = dbRef(realtimeDb, 'tickets');
                        await firebaseSet(ticketsRef, null);
                        alert('✅ Todos los tickets han sido eliminados');
                      } catch (error) {
                        console.error('Error eliminando tickets:', error);
                        alert('❌ Error al eliminar tickets');
                      }
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      background: 'var(--error)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Trash2 size={16} />
                    Limpiar Tickets
                  </button>
                </div>
                
                {/* Buscador de tickets */}
                <input
                  type="text"
                  placeholder="Buscar por número de ticket, usuario, email o asunto..."
                  value={ticketSearchQuery}
                  onChange={(e) => setTicketSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--bg-tertiary)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {(['todos', 'visto', 'revision', 'resuelto'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setTicketStatusFilter(status)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: ticketStatusFilter === status ? 'var(--primary)' : 'var(--bg-tertiary)',
                        color: ticketStatusFilter === status ? 'white' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }}
                    >
                      {status === 'todos' ? 'Todos' : status === 'visto' ? 'Vistos' : status === 'revision' ? 'En Revisión' : 'Resueltos'}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                // Filtrar tickets por estado y búsqueda
                const filteredTickets = tickets.filter(t => {
                  // Filtro por estado
                  const statusMatch = ticketStatusFilter === 'todos' || t.status === ticketStatusFilter;
                  
                  // Filtro por búsqueda
                  if (!ticketSearchQuery.trim()) {
                    return statusMatch;
                  }
                  
                  const query = ticketSearchQuery.toLowerCase();
                  return statusMatch && (
                    t.ticketNumber.toLowerCase().includes(query) ||
                    t.userName.toLowerCase().includes(query) ||
                    t.userEmail.toLowerCase().includes(query) ||
                    t.subject.toLowerCase().includes(query) ||
                    t.message.toLowerCase().includes(query)
                  );
                });
                
                if (filteredTickets.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      <TicketIcon size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                      <p>
                        {ticketSearchQuery.trim() 
                          ? `No se encontraron tickets que coincidan con "${ticketSearchQuery}"`
                          : `No hay tickets ${ticketStatusFilter !== 'todos' ? `con estado "${ticketStatusFilter}"` : ''}`
                        }
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredTickets.map(ticket => {
                      const statusColors: Record<TicketStatus, string> = {
                        visto: '#3B82F6',
                        revision: '#F59E0B',
                        resuelto: '#10B981'
                      };
                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          style={{
                            padding: '1rem',
                            background: selectedTicket?.id === ticket.id ? 'var(--primary)' : 'var(--bg-primary)',
                            color: selectedTicket?.id === ticket.id ? 'white' : 'var(--text-primary)',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            border: selectedTicket?.id === ticket.id ? '2px solid var(--primary)' : '1px solid var(--bg-tertiary)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '0.9375rem' }}>{ticket.ticketNumber}</strong>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              background: selectedTicket?.id === ticket.id ? 'rgba(255,255,255,0.2)' : statusColors[ticket.status] + '20',
                              color: selectedTicket?.id === ticket.id ? 'white' : statusColors[ticket.status],
                              fontWeight: 600
                            }}>
                              {ticket.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.875rem', opacity: selectedTicket?.id === ticket.id ? 1 : 0.8, marginBottom: '0.25rem' }}>
                            {ticket.subject}
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                            {ticket.userName} • {formatTimeAgo(new Date(ticket.createdAt))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Detalle del Ticket */}
            {selectedTicket ? (
              <div style={{ 
                flex: isMobile ? '1' : '1', 
                background: 'var(--bg-secondary)', 
                borderRadius: '0.75rem', 
                padding: '1.5rem',
                maxHeight: isMobile ? 'none' : 'calc(100vh - 300px)',
                overflowY: 'auto'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{selectedTicket.ticketNumber}</h3>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {selectedTicket.userName} ({selectedTicket.userEmail})
                        {selectedTicket.userPhone && ` • ${selectedTicket.userPhone}`}
                      </div>
                    </div>
                    <select
                      value={selectedTicket.status}
                      onChange={async (e) => {
                        if (!user) return;
                        const newStatus = e.target.value as TicketStatus;
                        try {
                          await updateTicketStatus(
                            selectedTicket.id,
                            newStatus,
                            user.id,
                            user.username,
                            ticketResponse || undefined
                          );
                          
                          // Enviar notificación al usuario directamente en Firebase
                          if (selectedTicket.userId) {
                            let notificationTitle = '';
                            let notificationMessage = '';
                            
                            switch (newStatus) {
                              case 'visto':
                                notificationTitle = 'Ticket Visto';
                                notificationMessage = `Tu ticket ${selectedTicket.ticketNumber} ha sido visto por nuestro equipo.`;
                                break;
                              case 'revision':
                                notificationTitle = 'Ticket en Revisión';
                                notificationMessage = `Tu ticket ${selectedTicket.ticketNumber} está en revisión. Te contactaremos pronto.`;
                                break;
                              case 'resuelto':
                                notificationTitle = 'Ticket Resuelto';
                                notificationMessage = `Tu ticket ${selectedTicket.ticketNumber} ha sido resuelto.${ticketResponse ? ' Revisá la respuesta en el Centro de Ayuda.' : ''}`;
                                break;
                            }
                            
                            try {
                              const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              const notificationRef = dbRef(realtimeDb, `notifications/${selectedTicket.userId}/${notificationId}`);
                              await firebaseSet(notificationRef, {
                                id: notificationId,
                                userId: selectedTicket.userId,
                                type: 'new_message',
                                title: notificationTitle,
                                message: notificationMessage,
                                link: '/ayuda',
                                read: false,
                                createdAt: new Date().toISOString()
                              });
                              console.log(`✅ Notificación enviada a usuario ${selectedTicket.userId}`);
                            } catch (notifError) {
                              console.error('Error enviando notificación:', notifError);
                            }
                          }
                          
                          setTicketResponse('');
                          alert('✅ Estado actualizado');
                        } catch (error) {
                          alert('❌ Error al actualizar estado');
                        }
                      }}
                      style={{
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--bg-tertiary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="visto">Visto</option>
                      <option value="revision">En Revisión</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Asunto:</strong>
                    <p style={{ color: 'var(--text-secondary)' }}>{selectedTicket.subject}</p>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Mensaje:</strong>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {selectedTicket.message}
                    </p>
                  </div>

                  {selectedTicket.adminResponse && (
                    <div style={{
                      background: 'var(--bg-tertiary)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Respuesta del Admin:</strong>
                      <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {selectedTicket.adminResponse}
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Respuesta (opcional):
                    </label>
                    <textarea
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      placeholder="Escribí una respuesta para el usuario..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--bg-tertiary)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await updateTicketStatus(
                          selectedTicket.id,
                          selectedTicket.status,
                          user.id,
                          user.username,
                          ticketResponse || undefined
                        );
                        
                        // Enviar notificación si hay respuesta
                        if (ticketResponse && selectedTicket.userId) {
                          try {
                            const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                            const notificationRef = dbRef(realtimeDb, `notifications/${selectedTicket.userId}/${notificationId}`);
                            await firebaseSet(notificationRef, {
                              id: notificationId,
                              userId: selectedTicket.userId,
                              type: 'new_message',
                              title: 'Respuesta a tu Ticket',
                              message: `Tu ticket ${selectedTicket.ticketNumber} tiene una nueva respuesta. Revisá el Centro de Ayuda.`,
                              link: '/ayuda',
                              read: false,
                              createdAt: new Date().toISOString()
                            });
                            console.log(`✅ Notificación enviada a usuario ${selectedTicket.userId}`);
                          } catch (notifError) {
                            console.error('Error enviando notificación:', notifError);
                          }
                        }
                        
                        setTicketResponse('');
                        alert('✅ Respuesta guardada');
                      } catch (error) {
                        alert('❌ Error al guardar respuesta');
                      }
                    }}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Guardar Respuesta
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ 
                flex: '1', 
                background: 'var(--bg-secondary)', 
                borderRadius: '0.75rem', 
                padding: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                textAlign: 'center'
              }}>
                <div>
                  <TicketIcon size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p>Seleccioná un ticket para ver los detalles</p>
                </div>
              </div>
            )}
          </div>

          {/* Mensajes de Contacto */}
          <div style={{ marginTop: '2rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                Mensajes de Contacto ({contactMessages.filter(m => !m.read).length} no leídos)
              </h3>
              <button
                onClick={async () => {
                  if (!confirm('⚠️ ¿Estás seguro de que querés eliminar TODOS los mensajes de contacto? Esta acción no se puede deshacer.')) {
                    return;
                  }
                  if (!confirm('⚠️ ÚLTIMA ADVERTENCIA: Se eliminarán TODOS los mensajes de contacto. ¿Continuar?')) {
                    return;
                  }
                  try {
                    const messagesRef = dbRef(realtimeDb, 'contactMessages');
                    await firebaseSet(messagesRef, null);
                    alert('✅ Todos los mensajes de contacto han sido eliminados');
                  } catch (error) {
                    console.error('Error eliminando mensajes de contacto:', error);
                    alert('❌ Error al eliminar mensajes de contacto');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  background: 'var(--error)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Trash2 size={16} />
                Limpiar Mensajes
              </button>
            </div>
            {contactMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <Mail size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                <p>No hay mensajes de contacto</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {contactMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '1rem',
                      background: msg.read ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                      borderRadius: '0.5rem',
                      border: msg.read ? '1px solid var(--bg-tertiary)' : '2px solid var(--primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <strong style={{ display: 'block' }}>{msg.name}</strong>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {msg.email} • {msg.phone}
                        </div>
                      </div>
                      {!msg.read && (
                        <button
                          onClick={async () => {
                            try {
                              await markContactMessageAsRead(msg.id);
                            } catch (error) {
                              alert('❌ Error al marcar como leído');
                            }
                          }}
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Marcar como leído
                        </button>
                      )}
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Asunto: {msg.subject}</strong>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </p>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      {formatTimeAgo(new Date(msg.createdAt))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anuncios Tab */}
      {activeTab === 'announcements' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Gestión de Anuncios
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Creá y gestioná anuncios para los usuarios
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAnnouncementMetrics(!showAnnouncementMetrics)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <BarChart3 size={20} />
                {showAnnouncementMetrics ? 'Ocultar' : 'Ver'} Métricas
              </button>
              <button
                onClick={() => setShowAnnouncementCreator(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={20} />
                Nuevo Anuncio
              </button>
            </div>
          </div>

          {/* Sección de Analytics */}
          {showAnnouncementMetrics && (
            <div style={{
              background: 'var(--bg-secondary)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} />
                Métricas de Anuncios
              </h3>
              {announcementMetrics.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No hay métricas disponibles aún. Las métricas se generan cuando los usuarios interactúan con los anuncios.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {announcementMetrics.map((metric: AnnouncementMetrics) => (
                    <div
                      key={metric.announcementId}
                      style={{
                        padding: '1rem',
                        background: 'var(--bg-primary)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)'
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        {metric.title}
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                        gap: '1rem',
                        marginTop: '0.5rem'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Vistas
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {metric.totalViews}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Clicks
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                            {metric.totalClicks}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Engagement Rate
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: metric.engagementRate > 15 ? 'var(--success)' : 'var(--warning)' }}>
                            {metric.engagementRate}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Usuarios Únicos
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {metric.uniqueUsers}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Descartados
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {metric.totalDismisses}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Clicks en Enlaces
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {metric.totalLinkClicks}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de anuncios existentes */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
              Anuncios Activos ({announcements.filter(a => a.status === 'active').length})
            </h3>
            {announcements.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                No hay anuncios creados aún
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    style={{
                      padding: '1rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{announcement.title}</h4>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: announcement.status === 'active' ? 'var(--success)' : 'var(--text-secondary)',
                        color: 'white'
                      }}>
                        {announcement.status === 'active' ? 'Activo' : announcement.status === 'expired' ? 'Expirado' : 'Borrador'}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {announcement.content.substring(0, 100)}...
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                        className="btn btn-danger"
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        <Trash2 size={16} style={{ marginRight: '0.25rem' }} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal de creación de anuncio */}
          {showAnnouncementCreator && (
            <AnnouncementCreator
              onClose={() => setShowAnnouncementCreator(false)}
              onSave={() => {
                setShowAnnouncementCreator(false);
              }}
            />
          )}
        </div>
      )}

      {/* Configuración Tab */}
      {activeTab === 'settings' && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)',
                fontSize: isMobile ? '1.5rem' : '2rem'
              }}>
                Configuración del Sistema
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Gestioná templates de mensajes, estadísticas y configuraciones avanzadas
              </p>
            </div>
          </div>

          {/* Templates de Mensajes Automáticos */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Mail size={24} />
              Templates de Mensajes Automáticos
            </h3>
            <p style={{ margin: 0, marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
              Personalizá los mensajes que se envían automáticamente a los usuarios. Usá variables como {'{username}'}, {'{amount}'}, {'{orderId}'}, etc.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messageTemplates.map((template) => {
                const isSelected = selectedTemplate === template.id;
                const variables = getVariablesForType(template.type);
                
                return (
                  <div 
                    key={template.id}
                    style={{
                      background: 'var(--bg-primary)',
                      padding: '1.5rem',
                      borderRadius: '0.75rem',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: isMobile ? '1rem' : '1.125rem' }}>
                            {template.title}
                          </h4>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: template.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                            color: template.active ? 'var(--success)' : 'var(--text-secondary)'
                          }}>
                            {template.active ? '✅ Activo' : '⏸️ Inactivo'}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                          Tipo: <strong>{template.type.replace('_', ' ')}</strong>
                        </p>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Variables disponibles:
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {variables.map((varName, idx) => (
                              <code 
                                key={idx}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  background: 'var(--bg-secondary)',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.8125rem',
                                  color: 'var(--primary)',
                                  fontFamily: 'monospace'
                                }}
                                title="Clic para copiar"
                                onClick={() => {
                                  navigator.clipboard.writeText(varName);
                                  alert(`✅ Variable ${varName} copiada`);
                                }}
                              >
                                {varName}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                        <button
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                            } else {
                              setSelectedTemplate(template.id);
                              handlePreviewTemplate(template);
                            }
                          }}
                          className={isSelected ? "btn btn-secondary" : "btn btn-primary"}
                          style={{ 
                            padding: '0.625rem 1rem',
                            fontSize: isMobile ? '0.8125rem' : '0.875rem',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isSelected ? 'Cerrar' : 'Editar'}
                        </button>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer',
                          padding: '0.625rem 1rem',
                          background: template.active ? 'var(--success)' : 'var(--bg-secondary)',
                          color: template.active ? 'white' : 'var(--text-primary)',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--border)',
                          fontSize: isMobile ? '0.8125rem' : '0.875rem'
                        }}>
                          <input
                            type="checkbox"
                            checked={template.active}
                            onChange={(e) => {
                              handleSaveTemplate(template.id, { active: e.target.checked });
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>{template.active ? 'Activo' : 'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border)'
                      }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            Título del Template
                          </label>
                          <input
                            type="text"
                            value={template.title}
                            onChange={(e) => {
                              const updated = { ...template, title: e.target.value };
                              setMessageTemplates(messageTemplates.map(t => t.id === template.id ? updated : t));
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '1rem'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            Contenido del Mensaje
                          </label>
                          <textarea
                            value={template.template}
                            onChange={(e) => {
                              const updated = { ...template, template: e.target.value };
                              setMessageTemplates(messageTemplates.map(t => t.id === template.id ? updated : t));
                              handlePreviewTemplate(updated);
                            }}
                            rows={8}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem',
                              fontFamily: 'monospace',
                              resize: 'vertical',
                              lineHeight: '1.6'
                            }}
                            placeholder="Ejemplo: ¡Felicitaciones {username}! Has ganado la subasta..."
                          />
                          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            💡 Tip: Usá las variables disponibles arriba para personalizar el mensaje
                          </p>
                        </div>
                        
                        {templatePreview && (
                          <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)'
                          }}>
                            <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                              👁️ Vista Previa:
                            </p>
                            <div style={{
                              padding: '1rem',
                              background: 'var(--bg-primary)',
                              borderRadius: '0.375rem',
                              whiteSpace: 'pre-wrap',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem',
                              lineHeight: '1.6',
                              border: '1px solid var(--border)'
                            }}>
                              {templatePreview}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              handleSaveTemplate(template.id, {
                                title: template.title,
                                template: template.template
                              });
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                            }}
                            className="btn btn-primary"
                            style={{ 
                              padding: '0.75rem 1.5rem',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            <Save size={18} style={{ marginRight: '0.5rem' }} />
                            Guardar Cambios
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTemplate(null);
                              setTemplatePreview('');
                              setMessageTemplates(loadMessageTemplates());
                            }}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '0.75rem 1.5rem',
                              fontSize: isMobile ? '0.875rem' : '0.9375rem'
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estadísticas y Configuración Avanzada */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: isMobile ? '1.5rem' : '2rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '1.5rem', 
              color: 'var(--text-primary)',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <BarChart3 size={24} />
              Estadísticas del Sistema
            </h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Gavel size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ingresos Subastas</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.auctionRevenue)}
                </div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Store size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ingresos Tienda</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.storeRevenue)}
                </div>
              </div>
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '0.75rem',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={20} />
                  <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Ganancia Neta</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                  {formatCurrency(enhancedStats.netProfit)}
                </div>
              </div>
            </div>
          </div>

          {/* Limpieza y Mantenimiento */}
          <div style={{
            display: isMobile ? 'block' : 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>
                🧹 Limpieza de Datos
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', fontSize: '0.875rem', opacity: 0.9 }}>
                Elimina datos antiguos según las reglas:
                <br />• Notificaciones leídas: 2 días
                <br />• Notificaciones no leídas: 7 días
                <br />• Subastas finalizadas: 3 días
                <br />• Pedidos completados: 7 días
              </p>
              <button
                onClick={handleManualCleanup}
                className="btn"
                style={{
                  background: 'white',
                  color: '#f59e0b',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <RefreshCw size={18} style={{ marginRight: '0.5rem' }} />
                Ejecutar Limpieza
              </button>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              color: 'white'
            }}>
              <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: isMobile ? '1.125rem' : '1.25rem' }}>
                ⚠️ Zona Peligrosa
              </h3>
              <p style={{ margin: 0, marginBottom: '1rem', fontSize: '0.875rem', opacity: 0.9 }}>
                El reseteo eliminará todos los datos excepto usuarios registrados y logs de ventas.
              </p>
              <button
                onClick={handleResetData}
                className="btn"
                style={{
                  background: 'white',
                  color: '#ef4444',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  fontSize: isMobile ? '0.875rem' : '0.9375rem'
                }}
              >
                <AlertTriangle size={18} style={{ marginRight: '0.5rem' }} />
                Resetear Sistema
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Modal de Detalles del Pedido con Historial de Transacciones */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: isMobile ? '1rem' : '2rem',
            overflow: 'auto'
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 700 }}>
                  📦 Detalles del Pedido
                </h2>
                <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                  {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-8).toUpperCase()}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div style={{ padding: '1.5rem' }}>
              {/* Información Principal del Pedido */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Cliente</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {selectedOrder.userName || 'Sin nombre'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Producto</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {selectedOrder.productName || 'Sin nombre'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Monto</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.25rem' }}>
                    {formatCurrency(selectedOrder.amount)}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Estado</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {getStatusBadge(selectedOrder.status).text}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Fecha de Creación</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('es-AR') : 'N/A'}
                  </div>
                </div>
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Método de Entrega</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {getDeliveryMethodBadge(selectedOrder.deliveryMethod || 'shipping').text}
                  </div>
                </div>
              </div>

              {/* Historial de Transacciones */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '0.75rem',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{
                  margin: '0 0 1rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FileText size={20} />
                  Historial de Transacciones
                </h3>
                
                {orderTransactions.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--text-secondary)'
                  }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p>No hay transacciones registradas para este pedido</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {orderTransactions.map((txn, index) => {
                      const txnDate = txn.date ? new Date(txn.date + 'T00:00:00').toLocaleDateString('es-AR') : 'N/A';
                      const txnTime = txn.time || 'N/A';
                      
                      return (
                        <div
                          key={txn.id || index}
                          style={{
                            padding: '1rem',
                            background: 'var(--bg-primary)',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            borderLeft: '4px solid var(--primary)'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '0.5rem'
                          }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem'
                              }}>
                                <span style={{
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                  fontSize: '0.9375rem'
                                }}>
                                  {txn.actionType === 'created' && '📦 Pedido Creado'}
                                  {txn.actionType === 'status_changed' && '🔄 Cambio de Estado'}
                                  {txn.actionType === 'payment_received' && '💳 Pago Recibido'}
                                  {txn.actionType === 'shipped' && '🚚 Enviado'}
                                  {txn.actionType === 'delivered' && '✅ Entregado'}
                                  {txn.actionType === 'cancelled' && '❌ Cancelado'}
                                  {!txn.actionType && '📝 Transacción'}
                                </span>
                              </div>
                              {txn.previousStatus && txn.newStatus && (
                                <div style={{
                                  fontSize: '0.875rem',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '0.25rem'
                                }}>
                                  {getStatusBadge(txn.previousStatus).text} → {getStatusBadge(txn.newStatus).text}
                                </div>
                              )}
                              {txn.adminName && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                  fontStyle: 'italic'
                                }}>
                                  Por: {txn.adminName}
                                </div>
                              )}
                            </div>
                            <div style={{
                              textAlign: 'right',
                              fontSize: '0.875rem',
                              color: 'var(--text-secondary)'
                            }}>
                              <div>{txnDate}</div>
                              <div>{txnTime}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Republicar Subasta */}
      {republishModal.show && republishModal.auction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: isMobile ? '1rem' : '2rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1rem',
            padding: isMobile ? '1.5rem' : '2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: isMobile ? '1.25rem' : '1.5rem',
              color: 'var(--text-primary)',
              fontWeight: 600
            }}>
              Republicar Subasta
            </h3>
            <p style={{
              margin: '0 0 1.5rem 0',
              fontSize: isMobile ? '0.9375rem' : '1rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}>
              ¿Cómo deseas republicar <strong>"{republishModal.auction.title}"</strong>?
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                onClick={handleRepublishWithEdit}
                style={{
                  padding: '0.875rem 1.25rem',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9375rem' : '1rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--secondary)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary)'}
              >
                ✏️ Editar antes de republicar
              </button>
              <button
                onClick={handleRepublishWithoutChanges}
                style={{
                  padding: '0.875rem 1.25rem',
                  background: 'var(--success)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9375rem' : '1rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                🔄 Republicar sin cambios
              </button>
              <button
                onClick={handleCancelRepublish}
                style={{
                  padding: '0.875rem 1.25rem',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.9375rem' : '1rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegación inferior móvil */}
      {isMobile && (
        <div className="admin-bottom-nav">
          {mainMobileTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-item-mobile ${isActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
                title={tab.label}
              >
                <Icon size={20} />
                <span style={{ fontSize: '0.65rem', lineHeight: '1' }}>{tab.label.length > 10 ? tab.label.substring(0, 10) + '...' : tab.label}</span>
                {tab.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '0.25rem',
                    right: '0.25rem',
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: 700
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
