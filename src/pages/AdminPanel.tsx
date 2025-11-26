// Firebase Realtime Database imports
import { ref as dbRef, update, remove, onValue, off, set as firebaseSet, get } from 'firebase/database';
import { realtimeDb } from '../config/firebase';

// Otras importaciones de Lucide, React, etc.
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Eye, Edit, Trash2, Users, Clock, AlertCircle, Activity, RefreshCw,
  Gavel, Package, Bot, DollarSign, Plus, XCircle, X,
  TrendingUp, ShoppingCart, Bell, AlertTriangle,
  Search, Filter, ShoppingBag, MapPin, BarChart3,
  MousePointerClick, Image as ImageIcon, Save, Store, Mail, Send,
  CheckCircle, Truck, FileText, Calendar, User, CreditCard,
  ArrowRight, ArrowDown, ArrowUp, Download, Trash, HelpCircle, Ticket as TicketIcon,
  MessageSquare, Palette, Shuffle, CheckSquare, Square, BookOpen, Upload,
  Calculator, Percent, Package2, TrendingDown, Copy, Check
} from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import UserDetailsModal from '../components/UserDetailsModal';
import StatsCard from '../components/StatsCard';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTimeAgo, generateUlid } from '../utils/helpers';
import { Product, Auction, Order, OrderStatus, NotificationRule, Shipment } from '../types';
import { getAllNotificationRules, createNotificationRule, updateNotificationRule, deleteNotificationRule } from '../utils/notificationRules';
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
import { blogArticles as staticBlogArticles } from '../data/blogArticles';
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
import { subscribeAllShipments, updateShipment as updateShipmentRecord } from '../utils/shipments';
import { triggerRuleBasedNotification } from '../utils/notificationRules';
import { Coupon, validateCouponForAmount } from '../utils/coupons';
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
  
  // Estados para gestión de blog
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [selectedBlogPost, setSelectedBlogPost] = useState<any>(null);
  const [isEditingBlogPost, setIsEditingBlogPost] = useState(false);
  const [blogSearchTerm, setBlogSearchTerm] = useState('');
  const [blogFilterCategory, setBlogFilterCategory] = useState<string>('all');
  const [blogCategories, setBlogCategories] = useState<string[]>([]);
  const [blogFilterPublished, setBlogFilterPublished] = useState<string>('all'); // all, published, draft
  
  // Estados para gestión de reglas de notificaciones
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [ruleFilter, setRuleFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [ruleSearch, setRuleSearch] = useState('');
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    eventType: 'new_message' as NotificationRule['eventType'],
    title: '',
    message: '',
    link: '',
    active: true,
    conditions: {
      minAmount: undefined as number | undefined,
      maxAmount: undefined as number | undefined,
      userRoles: [] as ('user' | 'admin')[],
      productTypes: [] as ('auction' | 'store')[]
    }
  });
  
  // Referencia para hacer scroll al inicio cuando cambia la pestaña
  const panelHeaderRef = useRef<HTMLDivElement>(null);
  
  // Cargar bots desde Firebase al montar el componente
  useEffect(() => {
    if (user?.isAdmin) {
      loadBots();
      // Log silencioso - funcionalidad oculta del admin
    }
  }, [user?.isAdmin, loadBots]);

  // Cargar preferencias desde Firebase cuando el usuario esté autenticado
  useEffect(() => {
    const loadPreferences = async () => {
      if (user?.id) {
        try {
          // Cargar messageTemplates
          const templates = await loadMessageTemplates(user.id);
          setMessageTemplates(templates);
          
          // Cargar quickReplies
          const replies = await loadQuickReplies(user.id);
          setQuickReplies(replies);
        } catch (error) {
          console.error('❌ Error cargando preferencias:', error);
        }
      }
    };

    loadPreferences();
  }, [user?.id]);

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
        try {
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
        } catch (error: any) {
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
        }
      });
      
      return () => {
        off(timestampRef);
      };
    }
  }, [user?.id]);
  
  // Scroll al inicio cuando cambia la pestaña activa
  useEffect(() => {
    if (panelHeaderRef.current) {
      panelHeaderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback: scroll al inicio de la página
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab]);
  
  // Cargar posts del blog desde Firebase
  useEffect(() => {
    if (user?.isAdmin && activeTab === 'blog') {
      const blogRef = dbRef(realtimeDb, 'blog');
      const unsubscribe = onValue(blogRef, (snapshot) => {
        const data = snapshot.val();
        console.log('[Blog] Datos recibidos de Firebase:', data);
        if (data && Object.keys(data).length > 0) {
          const postsArray = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          }));
          console.log('[Blog] Artículos procesados:', postsArray.length, postsArray);
          setBlogPosts(postsArray);
          
          // Extraer categorías únicas
          const categories = [...new Set(postsArray.map((post: any) => post.category).filter(Boolean))];
          setBlogCategories(categories);
        } else {
          console.log('[Blog] No hay artículos en Firebase');
          setBlogPosts([]);
          setBlogCategories([]);
        }
      }, (error) => {
        console.error('[Blog] Error cargando artículos:', error);
      });
      
      return () => {
        off(blogRef);
      };
    } else {
      // Limpiar cuando no está en la pestaña de blog
      setBlogPosts([]);
      setBlogCategories([]);
    }
  }, [user?.isAdmin, activeTab]);
  
  // Estado para configuración del inicio
  const [homeConfig, setHomeConfig] = useState<HomeConfig>(defaultHomeConfig);
  // Estado para modo activo en editor de colores
  const [activeColorMode, setActiveColorMode] = useState<'light' | 'dark' | 'experimental'>('light');
  
  // Función para generar colores aleatorios complementarios
  const generateComplementaryColors = (): ThemeColors => {
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

    // Si está en modo experimental, generar temas oscuros con estilos especiales
    if (activeColorMode === 'experimental') {
      const themeType = Math.floor(Math.random() * 5); // 0-4: neon, eléctrico, punk, cyberpunk, dark vibrant
      
      if (themeType === 0) {
        // NEON: Colores brillantes sobre fondos muy oscuros
        const neonHue = Math.floor(Math.random() * 360);
        const neonSecondary = (neonHue + 60 + Math.floor(Math.random() * 60)) % 360;
        
        return {
          primary: hslToHex(neonHue, 90 + Math.random() * 10, 50 + Math.random() * 10), // Muy saturado, brillante
          primaryHover: hslToHex(neonHue, 95, 60 + Math.random() * 10),
          secondary: hslToHex(neonSecondary, 85 + Math.random() * 15, 55 + Math.random() * 10),
          background: hslToHex(neonHue, 30 + Math.random() * 20, 8 + Math.random() * 5), // Muy oscuro
          backgroundSecondary: hslToHex(neonHue, 25 + Math.random() * 15, 12 + Math.random() * 5),
          backgroundTertiary: hslToHex(neonHue, 20 + Math.random() * 15, 18 + Math.random() * 5),
          textPrimary: hslToHex(neonHue, 20 + Math.random() * 20, 85 + Math.random() * 10), // Casi blanco con tinte
          textSecondary: hslToHex(neonHue, 15 + Math.random() * 15, 65 + Math.random() * 15),
          border: hslToHex(neonHue, 40 + Math.random() * 20, 25 + Math.random() * 10),
          success: hslToHex(120 + Math.random() * 30, 80 + Math.random() * 20, 50 + Math.random() * 15),
          warning: hslToHex(45 + Math.random() * 30, 85 + Math.random() * 15, 55 + Math.random() * 10),
          error: hslToHex(0 + Math.random() * 20, 90 + Math.random() * 10, 50 + Math.random() * 15),
          info: hslToHex(180 + Math.random() * 40, 85 + Math.random() * 15, 55 + Math.random() * 10)
        };
      } else if (themeType === 1) {
        // ELÉCTRICO: Azules/cyan brillantes sobre fondos oscuros
        const electricHue = 180 + Math.floor(Math.random() * 60); // Azul-cyan
        const electricAccent = (electricHue + 120 + Math.floor(Math.random() * 40)) % 360; // Complementario
        
        return {
          primary: hslToHex(electricHue, 85 + Math.random() * 15, 55 + Math.random() * 10),
          primaryHover: hslToHex(electricHue, 90, 65 + Math.random() * 10),
          secondary: hslToHex(electricAccent, 80 + Math.random() * 20, 60 + Math.random() * 10),
          background: hslToHex(electricHue, 40 + Math.random() * 20, 10 + Math.random() * 5),
          backgroundSecondary: hslToHex(electricHue, 35 + Math.random() * 15, 15 + Math.random() * 5),
          backgroundTertiary: hslToHex(electricHue, 30 + Math.random() * 15, 20 + Math.random() * 5),
          textPrimary: hslToHex(electricHue, 15 + Math.random() * 15, 90 + Math.random() * 5),
          textSecondary: hslToHex(electricHue, 20 + Math.random() * 20, 70 + Math.random() * 10),
          border: hslToHex(electricHue, 50 + Math.random() * 20, 30 + Math.random() * 10),
          success: hslToHex(150 + Math.random() * 20, 75 + Math.random() * 25, 55 + Math.random() * 15),
          warning: hslToHex(50 + Math.random() * 20, 80 + Math.random() * 20, 60 + Math.random() * 10),
          error: hslToHex(0 + Math.random() * 30, 85 + Math.random() * 15, 55 + Math.random() * 15),
          info: hslToHex(electricHue, 80 + Math.random() * 20, 60 + Math.random() * 10)
        };
      } else if (themeType === 2) {
        // PUNK: Rosas/magenta/rojos vibrantes sobre fondos oscuros
        const punkHue = 300 + Math.floor(Math.random() * 60); // Magenta-rosa
        const punkAccent = (punkHue + 180 + Math.floor(Math.random() * 40)) % 360; // Complementario (verde-cyan)
        
        return {
          primary: hslToHex(punkHue, 90 + Math.random() * 10, 50 + Math.random() * 15),
          primaryHover: hslToHex(punkHue, 95, 60 + Math.random() * 10),
          secondary: hslToHex(punkAccent, 85 + Math.random() * 15, 55 + Math.random() * 15),
          background: hslToHex(punkHue, 35 + Math.random() * 25, 8 + Math.random() * 5),
          backgroundSecondary: hslToHex(punkHue, 30 + Math.random() * 20, 12 + Math.random() * 5),
          backgroundTertiary: hslToHex(punkHue, 25 + Math.random() * 20, 18 + Math.random() * 5),
          textPrimary: hslToHex(punkHue, 10 + Math.random() * 15, 88 + Math.random() * 7),
          textSecondary: hslToHex(punkHue, 15 + Math.random() * 20, 65 + Math.random() * 15),
          border: hslToHex(punkHue, 45 + Math.random() * 25, 25 + Math.random() * 10),
          success: hslToHex(120 + Math.random() * 40, 75 + Math.random() * 25, 50 + Math.random() * 20),
          warning: hslToHex(30 + Math.random() * 30, 85 + Math.random() * 15, 55 + Math.random() * 15),
          error: hslToHex(0 + Math.random() * 30, 90 + Math.random() * 10, 50 + Math.random() * 15),
          info: hslToHex(200 + Math.random() * 40, 80 + Math.random() * 20, 55 + Math.random() * 15)
        };
      } else if (themeType === 3) {
        // CYBERPUNK: Verde-cyan y magenta sobre fondos muy oscuros
        const cyberHue = Math.random() < 0.5 ? 150 + Math.floor(Math.random() * 30) : 300 + Math.floor(Math.random() * 30);
        const cyberAccent = (cyberHue + 180) % 360;
        
        return {
          primary: hslToHex(cyberHue, 90 + Math.random() * 10, 50 + Math.random() * 15),
          primaryHover: hslToHex(cyberHue, 95, 60 + Math.random() * 10),
          secondary: hslToHex(cyberAccent, 85 + Math.random() * 15, 55 + Math.random() * 15),
          background: hslToHex(cyberHue, 30 + Math.random() * 20, 6 + Math.random() * 4),
          backgroundSecondary: hslToHex(cyberHue, 25 + Math.random() * 15, 10 + Math.random() * 4),
          backgroundTertiary: hslToHex(cyberHue, 20 + Math.random() * 15, 16 + Math.random() * 4),
          textPrimary: hslToHex(cyberHue, 20 + Math.random() * 20, 85 + Math.random() * 10),
          textSecondary: hslToHex(cyberHue, 15 + Math.random() * 15, 60 + Math.random() * 15),
          border: hslToHex(cyberHue, 50 + Math.random() * 20, 22 + Math.random() * 8),
          success: hslToHex(120 + Math.random() * 40, 80 + Math.random() * 20, 50 + Math.random() * 20),
          warning: hslToHex(45 + Math.random() * 30, 85 + Math.random() * 15, 55 + Math.random() * 15),
          error: hslToHex(0 + Math.random() * 30, 90 + Math.random() * 10, 50 + Math.random() * 15),
          info: hslToHex(180 + Math.random() * 40, 85 + Math.random() * 15, 55 + Math.random() * 15)
        };
      } else {
        // DARK VIBRANT: Cualquier color vibrante sobre fondo oscuro
        const vibrantHue = Math.floor(Math.random() * 360);
        const vibrantSecondary = (vibrantHue + 60 + Math.floor(Math.random() * 60)) % 360;
        
        return {
          primary: hslToHex(vibrantHue, 85 + Math.random() * 15, 50 + Math.random() * 20),
          primaryHover: hslToHex(vibrantHue, 90, 60 + Math.random() * 15),
          secondary: hslToHex(vibrantSecondary, 80 + Math.random() * 20, 55 + Math.random() * 20),
          background: hslToHex(vibrantHue, 25 + Math.random() * 25, 8 + Math.random() * 6),
          backgroundSecondary: hslToHex(vibrantHue, 20 + Math.random() * 20, 12 + Math.random() * 6),
          backgroundTertiary: hslToHex(vibrantHue, 18 + Math.random() * 18, 18 + Math.random() * 6),
          textPrimary: hslToHex(vibrantHue, 15 + Math.random() * 20, 85 + Math.random() * 10),
          textSecondary: hslToHex(vibrantHue, 12 + Math.random() * 18, 65 + Math.random() * 15),
          border: hslToHex(vibrantHue, 35 + Math.random() * 25, 25 + Math.random() * 10),
          success: hslToHex((vibrantHue + 120) % 360, 75 + Math.random() * 25, 50 + Math.random() * 20),
          warning: hslToHex((vibrantHue + 60) % 360, 80 + Math.random() * 20, 55 + Math.random() * 15),
          error: hslToHex((vibrantHue + 0) % 360, 85 + Math.random() * 15, 50 + Math.random() * 20),
          info: hslToHex((vibrantHue + 240) % 360, 80 + Math.random() * 20, 55 + Math.random() * 15)
        };
      }
    }
    
    // Para modos light y dark, mantener la lógica original
    // Generar un color base aleatorio (hue entre 0-360)
    const baseHue = Math.floor(Math.random() * 360);
    
    // Calcular el color complementario (180 grados de diferencia)
    const complementaryHue = (baseHue + 180) % 360;
    
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
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
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
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
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

  // Cargar reglas de notificaciones cuando se cambia a la tab de anuncios
  useEffect(() => {
    if (activeTab === 'announcements') {
      const unsubscribe = getAllNotificationRules((rules) => {
        setNotificationRules(rules);
      });
      return () => unsubscribe();
    } else {
      setNotificationRules([]);
    }
  }, [activeTab]);

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
  createdAt: new Date(),  // ← AGREGAR createdAt
  unitsPerBundle: auctionForm.unitsPerBundle > 0 ? auctionForm.unitsPerBundle : undefined,
  bundles: auctionForm.bundles > 0 ? auctionForm.bundles : undefined,
  sellOnlyByBundle: auctionForm.sellOnlyByBundle || false
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
  scheduledTime: '',
  unitsPerBundle: 1,
  bundles: 0,
  sellOnlyByBundle: false
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
  featured: false,
  unitsPerBundle: 1, // Unidades por bulto (uxb)
  bundles: 0, // Cantidad de bultos disponibles
  sellOnlyByBundle: false // Solo se vende por bulto completo
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
  scheduledTime: '',
  unitsPerBundle: 1, // Unidades por bulto (uxb)
  bundles: 0, // Cantidad de bultos disponibles
  sellOnlyByBundle: false // Solo se vende por bulto completo
});

  // Estados para bots
  const [botForm, setBotForm] = useState({
    name: '',
    balance: 10000,
    intervalMin: 5,
    intervalMax: 15,
    maxBidAmount: 5000,
    minIncrement: 500, // Incremento mínimo por oferta
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

  // Estados para envíos
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready_to_ship' | 'in_transit' | 'delayed' | 'delivered' | 'returned' | 'cancelled'>('all');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showAllShipments, setShowAllShipments] = useState(false);

  // Estado para cupones (Admin - Utilidades)
  const [couponDraft, setCouponDraft] = useState<Partial<Coupon> & { code: string }>({
    code: '',
    discountType: 'percent',
    value: 10,
    minAmount: undefined,
    maxUses: undefined,
    active: true
  });
  
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
    
    // Ingresos - incluir pedidos de tienda y subastas
    // Excluir pedidos de bots (ficticios)
    const isNotBotOrder = (o: { userId?: string; }) => !o.userId || !o.userId.startsWith('bot-');
    
    // Ingresos de pedidos de tienda (delivered)
    const storeOrdersRevenue = orders
      .filter((o: { status: string; type?: string; userId?: string; }) => 
        o.status === 'delivered' && o.type === 'store' && isNotBotOrder(o))
      .reduce((sum: any, o: { amount: any; }) => sum + (o.amount || 0), 0);
    
    // Ingresos de subastas (pedidos de subastas entregados)
    const auctionOrdersRevenue = orders
      .filter((o: { status: string; type?: string; userId?: string; }) => 
        o.status === 'delivered' && o.type === 'auction' && isNotBotOrder(o))
      .reduce((sum: any, o: { amount: any; }) => sum + (o.amount || 0), 0);
    
    // Ingresos totales (pedidos confirmados/pagados)
    const totalRevenue = orders
      .filter((o: { status: string; userId?: string; }) => 
        ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status) && isNotBotOrder(o))
      .reduce((sum: any, o: { amount: any; }) => sum + (o.amount || 0), 0);
    
    // Ingresos del mes
    const monthRevenue = orders
      .filter((o: { createdAt: string | number | Date; status: string; userId?: string; }) => {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && 
               orderDate.getFullYear() === now.getFullYear() &&
               ['payment_confirmed', 'processing', 'in_transit', 'delivered'].includes(o.status) &&
               isNotBotOrder(o);
      })
      .reduce((sum: any, o: { amount: any; }) => sum + (o.amount || 0), 0);
    
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
      revenue: { total: totalRevenue, month: monthRevenue, store: storeOrdersRevenue, auctions: auctionOrdersRevenue },
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

  // Suscribirse a envíos en tiempo real cuando la pestaña de Envíos está activa
  useEffect(() => {
    if (activeTab === 'shipments') {
      const unsubscribe = subscribeAllShipments((data) => {
        // Ordenar por fecha de creación (más recientes primero)
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt as any).getTime();
          const dateB = new Date(b.createdAt as any).getTime();
          return dateB - dateA;
        });
        setShipments(sorted);
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

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
    featured: product.featured === true,
    unitsPerBundle: product.unitsPerBundle || 1,
    bundles: product.bundles || 0,
    sellOnlyByBundle: product.sellOnlyByBundle || false
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
    featured: false,
    unitsPerBundle: 1,
    bundles: 0,
    sellOnlyByBundle: false
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

  // Validar unidades por bulto
  if (productForm.unitsPerBundle && productForm.unitsPerBundle < 1) {
    errors.push('Las unidades por bulto deben ser al menos 1');
  }

  // Validar bultos
  if (productForm.bundles && productForm.bundles < 0) {
    errors.push('Los bultos no pueden ser negativos');
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
        unitsPerBundle: productForm.unitsPerBundle || 1,
        bundles: productForm.bundles || 0,
        sellOnlyByBundle: productForm.sellOnlyByBundle || false,
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
        featured: false,
        unitsPerBundle: 1,
        bundles: 0,
        sellOnlyByBundle: false
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
  scheduledTime: '',
  unitsPerBundle: auction.unitsPerBundle || 1,
  bundles: auction.bundles || 0,
  sellOnlyByBundle: auction.sellOnlyByBundle || false
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
          isFlash: totalMinutes <= 60,
          unitsPerBundle: auctionForm.unitsPerBundle > 0 ? auctionForm.unitsPerBundle : undefined,
          bundles: auctionForm.bundles > 0 ? auctionForm.bundles : undefined,
          sellOnlyByBundle: auctionForm.sellOnlyByBundle || false
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
  const handleClearBotOrders = async () => {
    const botOrders = orders.filter((order: Order) => order.userId && order.userId.startsWith('bot-'));
    
    if (botOrders.length === 0) {
      alert('✅ No hay pedidos de bots para eliminar');
      return;
    }
    
    const confirm = window.confirm(
      `¿Eliminar ${botOrders.length} pedido(s) de bots?\n\nEsta acción eliminará todos los pedidos ficticios creados por bots.`
    );
    
    if (!confirm) return;
    
    try {
      let deletedCount = 0;
      let failedDeletions: string[] = [];
      
      for (const order of botOrders) {
        try {
          await remove(dbRef(realtimeDb, `orders/${order.id}`));
          deletedCount++;
          logOrderAction('Pedido de bot eliminado', order.id, user?.id, user?.username, {
            status: order.status,
            actionType: 'cleanup_bot'
          });
          await new Promise(resolve => setTimeout(resolve, 100)); // Pequeña pausa
        } catch (error: any) {
          console.error(`❌ Error eliminando pedido de bot ${order.id}:`, error);
          failedDeletions.push(order.id);
        }
      }
      
      if (failedDeletions.length > 0) {
        alert(`⚠️ Se eliminaron ${deletedCount} pedidos, pero ${failedDeletions.length} fallaron.`);
      } else {
        alert(`✅ Se eliminaron ${deletedCount} pedido(s) de bots correctamente`);
      }
      
      logAdminAction(`Limpieza de pedidos de bots: ${deletedCount} eliminados`, user?.id, user?.username);
    } catch (error: any) {
      console.error('❌ Error en limpieza de pedidos de bots:', error);
      alert('❌ Error al eliminar pedidos de bots. Por favor intenta nuevamente.');
    }
  };

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
        minIncrement: Number(botForm.minIncrement) || 500,
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
        minIncrement: 500,
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
  // Para órdenes de subastas, también verificar por productId + userId para evitar duplicados
  const uniqueOrders = orders.filter((order: Order, index: number, self: Order[]) => {
    // Primero filtrar por ID único
    const sameIdIndex = self.findIndex((o: Order) => o.id === order.id);
    if (index !== sameIdIndex) {
      return false; // Duplicado por ID
    }
    
    // Para órdenes de subastas, también verificar duplicados por productId + userId
    if (order.type === 'auction' && order.productId) {
      const duplicateByAuction = self.findIndex((o: Order) => 
        o.type === 'auction' &&
        o.productId === order.productId &&
        o.userId === order.userId &&
        o.id !== order.id // Diferente ID pero misma subasta y usuario
      );
      if (duplicateByAuction !== -1 && duplicateByAuction < index) {
        // Si hay una orden anterior con la misma subasta y usuario, mantener solo la primera
        return false;
      }
    }
    
    return true;
  });
  
  const filteredOrders = uniqueOrders.filter((order: Order) => {
    // Excluir pedidos de bots (los bots tienen userId que empieza con "bot-")
    if (order.userId && order.userId.startsWith('bot-')) {
      return false;
    }
    
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

  const visibleOrders =
    showAllOrders || filteredOrders.length <= 100
      ? filteredOrders
      : filteredOrders.slice(0, 100);

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
    // Ingresos por subastas (ventas ganadas) - usar la oferta ganadora real
    // Excluir subastas ganadas por bots (ficticias)
    const auctionsWithWinner = getAuctionsWithWinner(auctions);
    const auctionRevenue = auctionsWithWinner.reduce((sum: number, a: Auction) => {
      // Excluir si el ganador es un bot
      if (a.winnerId && a.winnerId.startsWith('bot-')) {
        return sum; // No contar ingresos de bots
      }
      // Si hay ofertas, usar la oferta más alta (ganadora)
      if (a.bids && a.bids.length > 0) {
        const winningBid = a.bids.reduce((highest, current) => 
          current.amount > highest.amount ? current : highest
        );
        return sum + winningBid.amount;
      }
      // Si no hay ofertas pero hay currentPrice, usar ese
      return sum + (a.currentPrice || 0);
    }, 0);

    // Ingresos por tienda (pedidos entregados)
    // Excluir pedidos de bots (ficticios)
    const storeRevenue = orders
      .filter((o: { status: string; userId?: string; }) => 
        o.status === 'delivered' && (!o.userId || !o.userId.startsWith('bot-')))
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
  // Usar useMemo para recalcular cuando cambien los datos o refreshKey
  const enhancedStats = useMemo(() => getEnhancedStats(), [auctions, orders, refreshKey]);
  const orderStats = useMemo(() => getTotalStats(), [orders, refreshKey]);
  
  // Filtrar subastas duplicadas para evitar claves duplicadas en React
  const uniqueAuctions = useMemo(() => {
    return auctions.filter((auction: Auction, index: number, self: Auction[]) => 
      index === self.findIndex((a: Auction) => a.id === auction.id)
    );
  }, [auctions]);

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
  const handleSaveTemplate = async (templateId: string, template: Partial<MessageTemplate>) => {
    if (!user?.id) {
      alert('❌ No hay usuario autenticado');
      return;
    }
    
    const success = await updateMessageTemplate(user.id, templateId, template);
    if (success) {
      const updated = await loadMessageTemplates(user.id);
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
    const reloadTemplates = async () => {
      if (activeTab === 'settings' && user?.id) {
        const templates = await loadMessageTemplates(user.id);
        setMessageTemplates(templates);
      }
    };
    reloadTemplates();
  }, [activeTab, user?.id]);

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

  // Función para importar artículos estáticos al blog
  const importStaticArticles = async () => {
    if (!user) return;
    
    console.log('[Blog Import] Iniciando importación de', staticBlogArticles.length, 'artículos');
    console.log('[Blog Import] Artículos a importar:', staticBlogArticles.map(a => ({ id: a.id, title: a.title })));
    
    if (!window.confirm(`¿Importar ${staticBlogArticles.length} artículos del blog al gestor?\n\nEsto creará/actualizará los artículos en Firebase.`)) {
        return;
      }

    try {
      let imported = 0;
      let updated = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      // Primero, obtener todos los artículos existentes para buscar por slug
      const allBlogRef = dbRef(realtimeDb, 'blog');
      const allBlogSnapshot = await get(allBlogRef);
      const existingArticles: { [key: string]: any } = allBlogSnapshot.exists() ? allBlogSnapshot.val() : {};
      console.log('[Blog Import] Artículos existentes en Firebase:', Object.keys(existingArticles));

      for (const article of staticBlogArticles) {
        try {
          // Buscar si ya existe un artículo con el mismo slug, título o ID similar
          let existingArticleKey: string | null = null;
          for (const [key, existingArticle] of Object.entries(existingArticles)) {
            // Buscar por slug primero
            if (existingArticle.slug && existingArticle.slug === article.slug) {
              existingArticleKey = key;
              console.log(`[Blog Import] Encontrado artículo existente por slug: ${key} (slug: ${existingArticle.slug})`);
              break;
            }
            // Buscar por título si no tiene slug o si el slug no coincide
            if (existingArticle.title && existingArticle.title.toLowerCase().trim() === article.title.toLowerCase().trim()) {
              existingArticleKey = key;
              console.log(`[Blog Import] Encontrado artículo existente por título: ${key} (título: ${existingArticle.title})`);
              break;
            }
            // Buscar por ID similar (para casos como blog_navidad_2024 vs blog_6)
            if (key.includes('navidad') && article.slug.includes('navidad')) {
              existingArticleKey = key;
              console.log(`[Blog Import] Encontrado artículo existente por ID similar (navidad): ${key}`);
              break;
            }
          }

          // Usar el ID existente si se encontró, o crear uno nuevo con prefijo 'blog_'
          const articleId = existingArticleKey || `blog_${article.id}`;
          console.log(`[Blog Import] Procesando artículo: ${articleId} - ${article.title} (slug: ${article.slug})`);
          
          const existingRef = dbRef(realtimeDb, `blog/${articleId}`);
          
          const articleData = {
            id: articleId,
            title: article.title,
            slug: article.slug,
            excerpt: article.excerpt,
            content: article.content,
            category: article.category,
            tags: article.tags || [],
            author: article.author || user.username || 'Admin',
            authorId: user.id,
            published: true, // Los artículos estáticos se importan como publicados
            createdAt: article.date || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            featuredImage: article.featuredImage || '',
            readTime: article.readTime || 5,
            views: 0
          };

          if (existingArticleKey) {
            // Actualizar artículo existente (mantener vistas y fecha de creación original)
            const existingData = existingArticles[existingArticleKey];
            console.log(`[Blog Import] Actualizando artículo existente: ${articleId}`);
            await firebaseSet(existingRef, {
              ...articleData,
              createdAt: existingData.createdAt || articleData.createdAt, // Mantener fecha original
              views: existingData.views || 0 // Mantener vistas
            });
            updated++;
          } else {
            // Crear nuevo artículo
            console.log(`[Blog Import] Creando nuevo artículo: ${articleId}`);
            await firebaseSet(existingRef, articleData);
            imported++;
          }
          console.log(`[Blog Import] ✅ Artículo procesado: ${articleId}`);
        } catch (error: any) {
          console.error(`[Blog Import] ❌ Error importando artículo ${article.title}:`, error);
          errors++;
          errorDetails.push(`${article.title}: ${error.message || 'Error desconocido'}`);
        }
      }

      const message = `✅ Importación completada:\n• ${imported} artículos nuevos\n• ${updated} artículos actualizados\n• ${errors} errores${errors > 0 ? '\n\nErrores:\n' + errorDetails.join('\n') : ''}`;
      alert(message);
      console.log('[Blog Import] Resultado final:', { imported, updated, errors, errorDetails });
      logAdminAction('Artículos del blog importados', user.id, user.username, { imported, updated, errors, errorDetails });
    } catch (error) {
      console.error('[Blog Import] Error general importando artículos:', error);
      alert('❌ Error al importar los artículos. Revisa la consola para más detalles.');
    }
  };

  // Funciones para gestión del blog
  const handleCreateBlogPost = () => {
    // Generar slug único basado en timestamp
    const timestamp = Date.now();
    const slug = `articulo-${timestamp}`;
    
    setSelectedBlogPost({
      id: `blog_${timestamp}`,
      title: '',
      slug: slug,
      content: '',
      excerpt: '',
      category: '',
      tags: [],
      bannerImage: '',
      featuredImage: '',
      author: user?.username || 'Admin',
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTime: 5,
      views: 0
    });
    setIsEditingBlogPost(true);
  };

  const handleEditBlogPost = (post: any) => {
    setSelectedBlogPost({ ...post });
    setIsEditingBlogPost(true);
  };

  const handleSaveBlogPost = async () => {
    if (!selectedBlogPost || !user) return;
    
    if (!selectedBlogPost.title || !selectedBlogPost.content) {
      alert('❌ Por favor completa el título y el contenido');
      return;
    }

    try {
      // Generar slug automáticamente si no existe
      let slug = selectedBlogPost.slug || '';
      if (!slug) {
        slug = selectedBlogPost.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^a-z0-9]+/g, '-') // Reemplazar espacios y caracteres especiales
          .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final
      }

      // Calcular tiempo de lectura aproximado (250 palabras por minuto)
      const wordCount = selectedBlogPost.content.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 250));

      const postData = {
        ...selectedBlogPost,
        slug: slug,
        readTime: readTime,
        updatedAt: new Date().toISOString(),
        author: user.username || 'Admin',
        authorId: user.id,
        createdAt: selectedBlogPost.createdAt || new Date().toISOString() // Mantener fecha original si existe
      };

      const postRef = dbRef(realtimeDb, `blog/${selectedBlogPost.id}`);
      await firebaseSet(postRef, postData);
      
      const action = selectedBlogPost.createdAt ? 'actualizada' : 'creada';
      alert(`✅ Entrada de blog ${action} correctamente`);
      setIsEditingBlogPost(false);
      setSelectedBlogPost(null);
      logAdminAction(`Entrada de blog ${action}`, user.id, user.username, { postId: selectedBlogPost.id, title: selectedBlogPost.title, published: postData.published });
    } catch (error) {
      console.error('Error guardando entrada de blog:', error);
      alert('❌ Error al guardar la entrada de blog');
    }
  };

  // Función para cambiar estado de publicación
  const handleTogglePublish = async (post: any) => {
    if (!user) return;
    
    const newPublishedState = !post.published;
    const action = newPublishedState ? 'publicar' : 'despublicar';
    
    if (!window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} "${post.title}"?`)) {
      return;
    }

    try {
      const postRef = dbRef(realtimeDb, `blog/${post.id}`);
      await update(postRef, {
        published: newPublishedState,
        updatedAt: new Date().toISOString()
      });
      
      alert(`✅ Artículo ${newPublishedState ? 'publicado' : 'despublicado'} correctamente`);
      logAdminAction(`Artículo ${action}do`, user.id, user.username, { postId: post.id, title: post.title });
    } catch (error) {
      console.error(`Error al ${action} artículo:`, error);
      alert(`❌ Error al ${action} el artículo`);
    }
  };

  const handleDeleteBlogPost = async (postId: string) => {
    if (!user) return;
    
    if (!window.confirm('¿Eliminar permanentemente esta entrada del blog?\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    try {
      const postRef = dbRef(realtimeDb, `blog/${postId}`);
      await remove(postRef);
      alert('✅ Entrada de blog eliminada');
      logAdminAction('Entrada de blog eliminada', user.id, user.username, { postId });
    } catch (error) {
      console.error('Error eliminando entrada de blog:', error);
      alert('❌ Error al eliminar la entrada de blog');
    }
  };

  const handleUploadBlogImage = async (file: File, type: 'banner' | 'featured') => {
    if (!user) return;
    
    try {
      const folder = `blog/${selectedBlogPost?.id || Date.now()}`;
      const uploadResult = await uploadImage(file, folder);
      
      if (uploadResult && selectedBlogPost) {
        if (type === 'banner') {
          setSelectedBlogPost({ ...selectedBlogPost, bannerImage: uploadResult });
        } else {
          setSelectedBlogPost({ ...selectedBlogPost, featuredImage: uploadResult });
        }
        alert('✅ Imagen subida correctamente');
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('❌ Error al subir la imagen');
    }
  };

  // Filtrar posts del blog
  const filteredBlogPosts = useMemo(() => {
    return blogPosts.filter((post: any) => {
      const matchesSearch = !blogSearchTerm || 
        post.title?.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(blogSearchTerm.toLowerCase()) ||
        post.tags?.some((tag: string) => tag.toLowerCase().includes(blogSearchTerm.toLowerCase()));
      
      const matchesCategory = blogFilterCategory === 'all' || post.category === blogFilterCategory;
      
      const matchesPublished = blogFilterPublished === 'all' || 
        (blogFilterPublished === 'published' && post.published) ||
        (blogFilterPublished === 'draft' && !post.published);
      
      return matchesSearch && matchesCategory && matchesPublished;
    }).sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [blogPosts, blogSearchTerm, blogFilterCategory, blogFilterPublished]);

  // Calcular contadores para bandeja unificada
  const unifiedUnreadCounts = getUnreadCountsByType(unifiedMessages);
  const totalUnreadUnified = unifiedUnreadCounts.total;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'auctions', label: 'Subastas', icon: Gavel },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'shipments', label: 'Envíos', icon: Truck },
    { id: 'bots', label: 'Bots', icon: Bot },
    { id: 'blog', label: 'Blog', icon: BookOpen },
    { id: 'utilities', label: 'Utilidades', icon: Calculator },
    { id: 'unified-inbox', label: 'Bandeja Unificada', icon: Mail, badge: totalUnreadUnified > 0 ? totalUnreadUnified : undefined },
    { id: 'messages', label: 'Mensajes', icon: MessageSquare, badge: adminUnreadCount > 0 ? adminUnreadCount : undefined },
    { id: 'tickets', label: 'Tickets', icon: TicketIcon, badge: tickets.filter(t => t.status !== 'resuelto').length > 0 ? tickets.filter(t => t.status !== 'resuelto').length : undefined },
    { id: 'announcements', label: 'Anuncios', icon: Bell },
    { id: 'home-config', label: 'Editor Home', icon: ImageIcon },
    { id: 'settings', label: 'Configuración', icon: Activity }
  ];


  // ============================================
  // COMPONENTES DE UTILIDADES
  // ============================================

  // Componente de Búsqueda de Productos
  const ProductSearch = ({ onSelectProduct, selectedProduct }: { onSelectProduct: (product: Product | null) => void; selectedProduct: Product | null }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const filteredProducts = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);

    const handleSelect = (product: Product) => {
      onSelectProduct(product);
      setSearchTerm(product.name);
      setShowResults(false);
    };

    const handleClear = () => {
      onSelectProduct(null);
      setSearchTerm('');
      setShowResults(false);
    };

    // Cerrar resultados al hacer click fuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
          setShowResults(false);
        }
      };

      if (showResults) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showResults]);

    return (
      <div ref={searchRef} style={{ position: 'relative', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Buscar Producto
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none'
              }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowResults(e.target.value.length > 0);
                }}
                onFocus={() => setShowResults(searchTerm.length > 0)}
                placeholder="Buscar por nombre o ID..."
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            {showResults && filteredProducts.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.25rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSelect(product)}
                    style={{
                      padding: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {product.images && product.images.length > 0 && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'cover',
                          borderRadius: '0.5rem'
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {formatCurrency(product.price)} • Stock: {product.stock}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedProduct && (
            <button
              onClick={handleClear}
              style={{
                marginTop: '1.75rem',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border)',
                background: 'var(--error)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Limpiar selección"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>
        {selectedProduct && (
          <div style={{
            padding: '0.75rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)'
          }}>
            <strong>Producto seleccionado:</strong> {selectedProduct.name} • Precio: {formatCurrency(selectedProduct.price)}
          </div>
        )}
      </div>
    );
  };

  // Calculadora de Costos y Ganancia
  const CostCalculator = () => {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [costoProducto, setCostoProducto] = useState('');
    const [porcentajeGanancia, setPorcentajeGanancia] = useState('');
    const [costoEnvio, setCostoEnvio] = useState('');
    const [impuestos, setImpuestos] = useState('');

    // Cargar datos del producto cuando se selecciona
    useEffect(() => {
      if (selectedProduct) {
        // Estimar costo basado en precio (asumiendo 30% de margen por defecto)
        const precioActual = selectedProduct.price || 0;
        const costoEstimado = precioActual / 1.3; // Estimación simple
        setCostoProducto(costoEstimado.toFixed(2));
        setPorcentajeGanancia('30');
      }
    }, [selectedProduct]);

    const calcular = () => {
      const costo = parseFloat(costoProducto) || 0;
      const ganancia = parseFloat(porcentajeGanancia) || 0;
      const envio = parseFloat(costoEnvio) || 0;
      const tax = parseFloat(impuestos) || 0;

      const gananciaMonto = (costo * ganancia) / 100;
      const subtotal = costo + gananciaMonto;
      const totalImpuestos = (subtotal * tax) / 100;
      const precioVenta = subtotal + totalImpuestos + envio;
      const gananciaNeta = precioVenta - costo - envio - totalImpuestos;
      const margenGanancia = costo > 0 ? (gananciaNeta / precioVenta) * 100 : 0;

      return {
        costo,
        gananciaMonto,
        subtotal,
        totalImpuestos,
        envio,
        precioVenta,
        gananciaNeta,
        margenGanancia
      };
    };

    const resultados = calcular();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ProductSearch onSelectProduct={setSelectedProduct} selectedProduct={selectedProduct} />
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Costo del Producto ($)
          </label>
          <input
            type="number"
            value={costoProducto}
            onChange={(e) => setCostoProducto(e.target.value)}
            placeholder="0.00"
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
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Porcentaje de Ganancia (%)
          </label>
          <input
            type="number"
            value={porcentajeGanancia}
            onChange={(e) => setPorcentajeGanancia(e.target.value)}
            placeholder="30"
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
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Costo de Envío ($)
          </label>
          <input
            type="number"
            value={costoEnvio}
            onChange={(e) => setCostoEnvio(e.target.value)}
            placeholder="0.00"
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
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Impuestos (%)
          </label>
          <input
            type="number"
            value={impuestos}
            onChange={(e) => setImpuestos(e.target.value)}
            placeholder="21"
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

        {(costoProducto || porcentajeGanancia) && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            border: '2px solid var(--primary)'
          }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Precio de Venta Sugerido
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>
              {formatCurrency(resultados.precioVenta)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ganancia Neta:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(resultados.gananciaNeta)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Margen:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{resultados.margenGanancia.toFixed(2)}%</span>
              </div>
            </div>

            {/* Generador de QR para links o IDs */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Activity size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Generador de QR
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Creá un QR para compartir links de productos, subastas, órdenes o cualquier URL
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Pegá una URL o ID (ej: link de subasta, producto, orden)"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    const img = document.getElementById('admin-qr-preview') as HTMLImageElement | null;
                    if (!img) return;
                    if (!value) {
                      img.src = '';
                      img.style.display = 'none';
                      return;
                    }
                    const encoded = encodeURIComponent(value);
                    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
                    img.style.display = 'block';
                  }}
                />

                <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                  <img
                    id="admin-qr-preview"
                    alt="QR generado"
                    style={{ display: 'none', margin: '0 auto', borderRadius: '0.75rem', background: 'white', padding: '0.5rem' }}
                  />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Hacé clic derecho sobre el QR para guardarlo o copiarlo y compartirlo donde quieras.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setSelectedProduct(null);
            setCostoProducto('');
            setPorcentajeGanancia('');
            setCostoEnvio('');
            setImpuestos('');
          }}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '0.75rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} />
          Limpiar Todo
        </button>
      </div>
    );
  };

  // Calculadora de Margen
  const MarginCalculator = () => {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [modoCalculo, setModoCalculo] = useState<'venta-costo' | 'margen' | 'markup'>('venta-costo');
    const [precioVenta, setPrecioVenta] = useState('');
    const [costo, setCosto] = useState('');
    const [margenDeseado, setMargenDeseado] = useState('');
    const [markupDeseado, setMarkupDeseado] = useState('');

    // Cargar datos del producto cuando se selecciona
    useEffect(() => {
      if (selectedProduct) {
        setPrecioVenta((selectedProduct.price || 0).toString());
        // Estimar costo basado en precio (asumiendo 30% de margen por defecto)
        const precioActual = selectedProduct.price || 0;
        const costoEstimado = precioActual / 1.3;
        setCosto(costoEstimado.toFixed(2));
        setMargenDeseado('30');
        setMarkupDeseado('42.86'); // Markup equivalente a 30% de margen
      }
    }, [selectedProduct]);

    const calcular = () => {
      if (modoCalculo === 'venta-costo') {
        // Modo: Precio de venta y costo → calcular margen y markup
        const venta = parseFloat(precioVenta) || 0;
        const costoVal = parseFloat(costo) || 0;
        const ganancia = venta - costoVal;
        const margenPorcentaje = venta > 0 ? (ganancia / venta) * 100 : 0;
        const markupPorcentaje = costoVal > 0 ? (ganancia / costoVal) * 100 : 0;
        return { 
          tipo: 'venta-costo',
          ganancia, 
          margenPorcentaje, 
          markupPorcentaje,
          precioVenta: venta,
          costo: costoVal
        };
      } else if (modoCalculo === 'margen') {
        // Modo: Costo y margen deseado → calcular precio de venta
        const costoVal = parseFloat(costo) || 0;
        const margen = parseFloat(margenDeseado) || 0;
        if (costoVal > 0 && margen >= 0 && margen < 100) {
          const precioVentaCalculado = costoVal / (1 - margen / 100);
          const ganancia = precioVentaCalculado - costoVal;
          const markupPorcentaje = costoVal > 0 ? (ganancia / costoVal) * 100 : 0;
          return {
            tipo: 'margen',
            precioVenta: precioVentaCalculado,
            costo: costoVal,
            ganancia,
            margenPorcentaje: margen,
            markupPorcentaje
          };
        }
        return { tipo: 'margen', precioVenta: 0, costo: costoVal, ganancia: 0, margenPorcentaje: margen, markupPorcentaje: 0 };
      } else {
        // Modo: Costo y markup deseado → calcular precio de venta
        const costoVal = parseFloat(costo) || 0;
        const markup = parseFloat(markupDeseado) || 0;
        if (costoVal > 0 && markup >= 0) {
          const ganancia = (costoVal * markup) / 100;
          const precioVentaCalculado = costoVal + ganancia;
          const margenPorcentaje = precioVentaCalculado > 0 ? (ganancia / precioVentaCalculado) * 100 : 0;
          return {
            tipo: 'markup',
            precioVenta: precioVentaCalculado,
            costo: costoVal,
            ganancia,
            margenPorcentaje,
            markupPorcentaje: markup
          };
        }
        return { tipo: 'markup', precioVenta: 0, costo: costoVal, ganancia: 0, margenPorcentaje: 0, markupPorcentaje: markup };
      }
    };

    const resultados = calcular();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ProductSearch onSelectProduct={setSelectedProduct} selectedProduct={selectedProduct} />
        
        {/* Selector de Modo */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Modo de Cálculo
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <button
              onClick={() => setModoCalculo('venta-costo')}
              style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                border: `2px solid ${modoCalculo === 'venta-costo' ? 'var(--primary)' : 'var(--border)'}`,
                background: modoCalculo === 'venta-costo' ? 'var(--primary)' : 'var(--bg-primary)',
                color: modoCalculo === 'venta-costo' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Venta → Margen
            </button>
            <button
              onClick={() => setModoCalculo('margen')}
              style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                border: `2px solid ${modoCalculo === 'margen' ? 'var(--primary)' : 'var(--border)'}`,
                background: modoCalculo === 'margen' ? 'var(--primary)' : 'var(--bg-primary)',
                color: modoCalculo === 'margen' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Margen → Venta
            </button>
            <button
              onClick={() => setModoCalculo('markup')}
              style={{
                padding: '0.625rem',
                borderRadius: '0.5rem',
                border: `2px solid ${modoCalculo === 'markup' ? 'var(--primary)' : 'var(--border)'}`,
                background: modoCalculo === 'markup' ? 'var(--primary)' : 'var(--bg-primary)',
                color: modoCalculo === 'markup' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              Markup → Venta
            </button>
          </div>
        </div>

        {/* Campo Costo - Siempre visible */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Costo del Producto ($) *
          </label>
          <input
            type="number"
            value={costo}
            onChange={(e) => setCosto(e.target.value)}
            placeholder="0.00"
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

        {/* Campos según el modo */}
        {modoCalculo === 'venta-costo' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Precio de Venta ($)
            </label>
            <input
              type="number"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="0.00"
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
            <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Ingresa el precio de venta para calcular el margen y markup
            </small>
          </div>
        )}

        {modoCalculo === 'margen' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Margen de Ganancia Deseado (%)
            </label>
            <input
              type="number"
              value={margenDeseado}
              onChange={(e) => {
                const valor = e.target.value;
                setMargenDeseado(valor);
                // Calcular markup equivalente automáticamente
                if (valor && parseFloat(valor) >= 0 && parseFloat(valor) < 100) {
                  const margen = parseFloat(valor);
                  const markup = (margen / (100 - margen)) * 100;
                  setMarkupDeseado(markup.toFixed(2));
                }
              }}
              placeholder="30"
              min="0"
              max="99.99"
              step="0.01"
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
            <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Porcentaje de ganancia sobre el precio de venta (0-99%)
            </small>
          </div>
        )}

        {modoCalculo === 'markup' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
              Markup de Ganancia Deseado (%)
            </label>
            <input
              type="number"
              value={markupDeseado}
              onChange={(e) => {
                const valor = e.target.value;
                setMarkupDeseado(valor);
                // Calcular margen equivalente automáticamente
                if (valor && parseFloat(valor) >= 0) {
                  const markup = parseFloat(valor);
                  const margen = (markup / (100 + markup)) * 100;
                  setMargenDeseado(margen.toFixed(2));
                }
              }}
              placeholder="42.86"
              min="0"
              step="0.01"
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
            <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              Porcentaje de ganancia sobre el costo
            </small>
          </div>
        )}

        {/* Resultados */}
        {((modoCalculo === 'venta-costo' && precioVenta && costo) || 
          (modoCalculo === 'margen' && costo && margenDeseado) ||
          (modoCalculo === 'markup' && costo && markupDeseado)) && (
          <div style={{
            marginTop: '1rem',
            padding: '1.25rem',
            background: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            border: '2px solid var(--success)',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)'
          }}>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              {modoCalculo === 'venta-costo' ? 'Resultados del Análisis' : 'Precio de Venta Calculado'}
            </div>
            
            {(modoCalculo === 'margen' || modoCalculo === 'markup') && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Precio de Venta Recomendado
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                  {formatCurrency(resultados.precioVenta)}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ganancia:</span>
                <span style={{ fontWeight: 600, color: resultados.ganancia >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {formatCurrency(resultados.ganancia)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Margen:</span>
                <span style={{ fontWeight: 600, color: resultados.margenPorcentaje >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {resultados.margenPorcentaje.toFixed(2)}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Markup:</span>
                <span style={{ fontWeight: 600, color: resultados.markupPorcentaje >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  {resultados.markupPorcentaje.toFixed(2)}%
                </span>
              </div>
              {modoCalculo === 'venta-costo' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Costo:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {formatCurrency(resultados.costo)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setSelectedProduct(null);
            setPrecioVenta('');
            setCosto('');
            setMargenDeseado('');
            setMarkupDeseado('');
            setModoCalculo('venta-costo');
          }}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '0.75rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} />
          Limpiar Todo
        </button>
      </div>
    );
  };

  // Calculadora de Descuentos
  const DiscountCalculator = () => {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [precioOriginal, setPrecioOriginal] = useState('');
    const [descuento, setDescuento] = useState('');
    const [tipoDescuento, setTipoDescuento] = useState<'porcentaje' | 'fijo'>('porcentaje');

    // Cargar datos del producto cuando se selecciona
    useEffect(() => {
      if (selectedProduct) {
        setPrecioOriginal((selectedProduct.price || 0).toString());
      }
    }, [selectedProduct]);

    const calcular = () => {
      const original = parseFloat(precioOriginal) || 0;
      const desc = parseFloat(descuento) || 0;

      let precioFinal = 0;
      let ahorro = 0;

      if (tipoDescuento === 'porcentaje') {
        ahorro = (original * desc) / 100;
        precioFinal = original - ahorro;
      } else {
        ahorro = desc;
        precioFinal = original - desc;
      }

      const porcentajeReal = original > 0 ? (ahorro / original) * 100 : 0;

      return { precioFinal, ahorro, porcentajeReal };
    };

    const resultados = calcular();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ProductSearch onSelectProduct={setSelectedProduct} selectedProduct={selectedProduct} />
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Precio Original ($)
          </label>
          <input
            type="number"
            value={precioOriginal}
            onChange={(e) => setPrecioOriginal(e.target.value)}
            placeholder="0.00"
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
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Tipo de Descuento
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => setTipoDescuento('porcentaje')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: `2px solid ${tipoDescuento === 'porcentaje' ? 'var(--primary)' : 'var(--border)'}`,
                background: tipoDescuento === 'porcentaje' ? 'var(--primary)' : 'var(--bg-primary)',
                color: tipoDescuento === 'porcentaje' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Porcentaje (%)
            </button>
            <button
              onClick={() => setTipoDescuento('fijo')}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: `2px solid ${tipoDescuento === 'fijo' ? 'var(--primary)' : 'var(--border)'}`,
                background: tipoDescuento === 'fijo' ? 'var(--primary)' : 'var(--bg-primary)',
                color: tipoDescuento === 'fijo' ? 'white' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600
              }}
            >
              Monto Fijo ($)
            </button>
          </div>
          <input
            type="number"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            placeholder={tipoDescuento === 'porcentaje' ? '10' : '0.00'}
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

        {(precioOriginal && descuento) && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            border: '2px solid var(--warning)'
          }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Precio Final
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '1rem' }}>
              {formatCurrency(resultados.precioFinal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ahorro:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(resultados.ahorro)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Descuento Real:</span>
                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{resultados.porcentajeReal.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setSelectedProduct(null);
            setPrecioOriginal('');
            setDescuento('');
            setTipoDescuento('porcentaje');
          }}
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '0.75rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <RefreshCw size={16} />
          Limpiar Todo
        </button>
      </div>
    );
  };

  // Generador de Códigos
  const CodeGenerator = () => {
    const [codigo, setCodigo] = useState('');
    const [longitud, setLongitud] = useState(8);
    const [copiado, setCopiado] = useState(false);

    const generarCodigo = () => {
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let nuevoCodigo = '';
      for (let i = 0; i < longitud; i++) {
        nuevoCodigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      setCodigo(nuevoCodigo);
      setCopiado(false);
    };

    const copiarCodigo = () => {
      if (codigo) {
        navigator.clipboard.writeText(codigo);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
            Longitud del Código
          </label>
          <input
            type="number"
            value={longitud}
            onChange={(e) => setLongitud(Math.max(4, Math.min(20, parseInt(e.target.value) || 8)))}
            min="4"
            max="20"
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

        <button
          onClick={generarCodigo}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem' }}
        >
          Generar Código
        </button>

        {codigo && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: 'var(--bg-primary)',
            borderRadius: '0.75rem',
            border: '2px solid var(--primary)'
          }}>
            <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Código Generado
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              marginBottom: '0.75rem'
            }}>
              <code style={{
                flex: 1,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--primary)',
                letterSpacing: '2px',
                fontFamily: 'monospace'
              }}>
                {codigo}
              </code>
              <button
                onClick={copiarCodigo}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)',
                  background: copiado ? 'var(--success)' : 'var(--bg-tertiary)',
                  color: copiado ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Copiar código"
              >
                {copiado ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
      <div ref={panelHeaderRef} className={isMobile ? 'admin-header-mobile' : ''} style={{ 
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

      {/* Tabs Navigation - Siempre visible en la parte superior (sticky) */}
      <div className="admin-top-nav" style={{
        padding: isMobile ? '0.75rem 1rem' : '1rem 0',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: isMobile ? '0.375rem' : '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
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
                  padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.5rem',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0.375rem' : '0.5rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  position: 'relative',
                  flexShrink: 0
                }}
              >
                <Icon size={isMobile ? 16 : 18} />
                {tab.label}
                {tab.badge && (
                  <span style={{
                    background: 'var(--error)',
                    color: 'white',
                    borderRadius: '50%',
                    width: isMobile ? '18px' : '20px',
                    height: isMobile ? '18px' : '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '0.625rem' : '0.75rem',
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
      </div>

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
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: isMobile ? '0.5rem' : '1.5rem',
            marginBottom: '2rem',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            <StatsCard
              title="Usuarios Totales"
              value={stats.users.total}
              icon={Users}
              color="var(--primary)"
              subtitle={`${stats.users.active} activos`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Subastas Activas"
              value={stats.auctions.active}
              icon={Gavel}
              color="var(--success)"
              subtitle={`${stats.auctions.ended} finalizadas`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Productos"
              value={stats.products.total}
              icon={Package}
              color="var(--warning)"
              subtitle={`${stats.products.active} activos`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Pedidos Totales"
              value={stats.orders.total}
              icon={ShoppingCart}
              color="var(--info)"
              subtitle={`${orderStats.delivered} entregados`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Ingresos Totales"
              value={formatCurrency(enhancedStats.totalRevenue)}
              icon={DollarSign}
              color="var(--success)"
              subtitle={`${formatCurrency(stats.revenue.month)} este mes`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Bots Activos"
              value={stats.bots.active}
              icon={Bot}
              color="var(--secondary)"
              subtitle={`${stats.bots.totalBalance.toLocaleString()} balance total`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Tickets"
              value={stats.tickets.total}
              icon={TicketIcon}
              color="var(--warning)"
              subtitle={`${stats.tickets.pending} pendientes, ${stats.tickets.resolved} resueltos`}
              isMobile={isMobile}
            />
            <StatsCard
              title="Mensajes de Contacto"
              value={stats.contactMessages.total}
              icon={Mail}
              color="var(--info)"
              subtitle={`${stats.contactMessages.unread} no leídos`}
              isMobile={isMobile}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={20} />
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Más Buscado
                  </h3>
                </div>
                {enhancedStats.mostSearched.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de que querés eliminar todas las búsquedas registradas?')) {
                        try {
                          await trackingSystem.clearSearches();
                          // Forzar re-render actualizando el refreshKey
                          setRefreshKey(prev => prev + 1);
                          alert('✅ Búsquedas eliminadas correctamente');
                          logAdminAction('Búsquedas de tracking eliminadas', user?.id, user?.username);
                        } catch (error) {
                          console.error('Error eliminando búsquedas:', error);
                          alert('❌ Error al eliminar búsquedas. Revisa la consola.');
                        }
                      }
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Trash2 size={14} />
                    Limpiar
                  </button>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MousePointerClick size={20} />
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Más Cliqueado
                  </h3>
                </div>
                {enhancedStats.mostClicked.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm('¿Estás seguro de que querés eliminar todos los clicks registrados?')) {
                        try {
                          await trackingSystem.clearClicks();
                          // Forzar re-render actualizando el refreshKey
                          setRefreshKey(prev => prev + 1);
                          alert('✅ Clicks eliminados correctamente');
                          logAdminAction('Clicks de tracking eliminados', user?.id, user?.username);
                        } catch (error) {
                          console.error('Error eliminando clicks:', error);
                          alert('❌ Error al eliminar clicks. Revisa la consola.');
                        }
                      }
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      background: 'var(--error)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Trash2 size={14} />
                    Limpiar
                  </button>
                )}
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
                  scheduledTime: '',
                  unitsPerBundle: 1,
                  bundles: 0,
                  sellOnlyByBundle: false
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
            {uniqueAuctions.map((auction: Auction) => (
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

              {/* Unidades por Bulto y Bultos */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Unidades por Bulto (uxb)
                  </label>
                  <input
                    type="number"
                    value={auctionForm.unitsPerBundle || 1}
                    onChange={(e) => {
                      const unitsPerBundle = Number(e.target.value) || 1;
                      setAuctionForm({ ...auctionForm, unitsPerBundle });
                    }}
                    min="1"
                    placeholder="Ej: 6"
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
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Cantidad de unidades que contiene cada bulto
                  </small>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Bultos Disponibles
                  </label>
                  <input
                    type="number"
                    value={auctionForm.bundles || 0}
                    onChange={(e) => {
                      const bundles = Number(e.target.value) || 0;
                      setAuctionForm({ ...auctionForm, bundles });
                    }}
                    min="0"
                    placeholder="Ej: 10"
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
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Cantidad de bultos disponibles
                  </small>
                </div>
              </div>

              {/* Opción: Solo se vende por bulto */}
              {auctionForm.unitsPerBundle && auctionForm.unitsPerBundle > 0 && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    <input
                      type="checkbox"
                      checked={auctionForm.sellOnlyByBundle || false}
                      onChange={(e) => setAuctionForm({ ...auctionForm, sellOnlyByBundle: e.target.checked })}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary)'
                      }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>Solo se vende por bulto completo</span>
                      <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        Si está activado, los clientes solo podrán comprar bultos completos ({auctionForm.unitsPerBundle} unidades), no unidades individuales
                      </small>
                    </div>
                  </label>
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
                      {product.unitsPerBundle && product.unitsPerBundle > 0 && product.bundles && product.bundles > 0 && (
                        <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem' }}>
                          ({product.bundles} bulto{product.bundles !== 1 ? 's' : ''} × {product.unitsPerBundle} uxb)
                        </span>
                      )}
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

              {/* Unidades por Bulto y Bultos */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Unidades por Bulto (uxb) *
                  </label>
                  <input
                    type="number"
                    value={productForm.unitsPerBundle || 1}
                    onChange={(e) => {
                      const unitsPerBundle = Number(e.target.value) || 1;
                      const bundles = productForm.bundles || 0;
                      const calculatedStock = unitsPerBundle * bundles;
                      setProductForm({ 
                        ...productForm, 
                        unitsPerBundle,
                        stock: calculatedStock > 0 ? calculatedStock : productForm.stock
                      });
                    }}
                    min="1"
                    placeholder="Ej: 12"
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
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Cantidad de unidades que contiene cada bulto
                  </small>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Bultos Disponibles *
                  </label>
                  <input
                    type="number"
                    value={productForm.bundles || 0}
                    onChange={(e) => {
                      const bundles = Number(e.target.value) || 0;
                      const unitsPerBundle = productForm.unitsPerBundle || 1;
                      const calculatedStock = unitsPerBundle * bundles;
                      setProductForm({ 
                        ...productForm, 
                        bundles,
                        stock: calculatedStock > 0 ? calculatedStock : productForm.stock
                      });
                    }}
                    min="0"
                    placeholder="Ej: 10"
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
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Cantidad de bultos en stock
                    {productForm.unitsPerBundle && productForm.bundles && (
                      <span style={{ display: 'block', marginTop: '0.25rem', fontWeight: 500, color: 'var(--primary)' }}>
                        Total: {(productForm.unitsPerBundle * productForm.bundles).toLocaleString()} unidades
                      </span>
                    )}
                  </small>
                </div>
              </div>

              {/* Opción: Solo se vende por bulto */}
              {productForm.unitsPerBundle && productForm.unitsPerBundle > 0 && (
                <div style={{
                  padding: '1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border)'
                }}>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem', 
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontWeight: 500
                  }}>
                    <input
                      type="checkbox"
                      checked={productForm.sellOnlyByBundle || false}
                      onChange={(e) => setProductForm({ ...productForm, sellOnlyByBundle: e.target.checked })}
                      style={{ 
                        width: '18px', 
                        height: '18px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary)'
                      }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>Solo se vende por bulto completo</span>
                      <small style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        Si está activado, los clientes solo podrán comprar bultos completos ({productForm.unitsPerBundle} unidades), no unidades individuales
                      </small>
                    </div>
                  </label>
                </div>
              )}

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
                  onClick={() => setSelectedUser(userItem)}
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
            {!isMobile && (
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
                      const errors: string[] = [];
                      for (const order of ordersToDelete) {
                        try {
                          // Verificar que el pedido existe antes de eliminarlo
                          const orderRef = dbRef(realtimeDb, `orders/${order.id}`);
                          await remove(orderRef);
                          deletedCount++;
                          logOrderAction('Pedido eliminado (limpieza >30 días)', order.id, user?.id, user?.username, { 
                            status: order.status,
                            actionType: 'cleanup_old'
                          });
                          // Pequeño delay para asegurar que Firebase procese la eliminación
                          await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (error: any) {
                          console.error(`Error eliminando pedido ${order.id}:`, error);
                          errors.push(`Pedido ${order.id}: ${error.message || 'Error desconocido'}`);
                        }
                      }
                      
                      // Actualizar estado local después de todas las eliminaciones
                      const cleanedOrders = orders.filter((o: Order) => !ordersToDelete.find(d => d.id === o.id));
                      setOrders(cleanedOrders);
                      
                      logAdminAction(`Limpieza de pedidos: ${deletedCount} eliminados de Firebase`, user?.id, user?.username);
                      if (errors.length > 0) {
                        alert(`⚠️ ${deletedCount} pedidos eliminados, ${errors.length} errores:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
                      } else {
                        alert(`✅ ${deletedCount} pedidos antiguos eliminados de Firebase`);
                      }
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.9375rem'
                  }}
                >
                  <Trash size={18} />
                  Limpiar {'>'}30 días
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
                      const errors: string[] = [];
                      for (const order of ordersToDelete) {
                        try {
                          // Verificar que el pedido existe antes de eliminarlo
                          const orderRef = dbRef(realtimeDb, `orders/${order.id}`);
                          await remove(orderRef);
                          deletedCount++;
                          logOrderAction('Pedido eliminado (limpieza <30 días)', order.id, user?.id, user?.username, { 
                            status: order.status,
                            actionType: 'cleanup_recent'
                          });
                          // Pequeño delay para asegurar que Firebase procese la eliminación
                          await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (error: any) {
                          console.error(`Error eliminando pedido ${order.id}:`, error);
                          errors.push(`Pedido ${order.id}: ${error.message || 'Error desconocido'}`);
                        }
                      }
                      
                      // Actualizar estado local después de todas las eliminaciones
                      const cleanedOrders = orders.filter((o: Order) => !ordersToDelete.find(d => d.id === o.id));
                      setOrders(cleanedOrders);
                      
                      logAdminAction(`Limpieza de pedidos recientes: ${deletedCount} eliminados de Firebase`, user?.id, user?.username);
                      if (errors.length > 0) {
                        alert(`⚠️ ${deletedCount} pedidos eliminados, ${errors.length} errores:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
                      } else {
                        alert(`✅ ${deletedCount} pedidos recientes eliminados de Firebase`);
                      }
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.9375rem'
                  }}
                >
                  <Trash size={18} />
                  Limpiar {'<'}30 días
                </button>
              </div>
            )}
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

          {/* Botones de limpieza - Solo en móvil, debajo de los cuadros */}
          {isMobile && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem',
              width: '100%'
            }}>
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
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                <Trash size={18} />
                Limpiar {'>'}30 días
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
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                <Trash size={18} />
                Limpiar {'<'}30 días
              </button>
            </div>
          )}

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
          {/* Limitar visualmente a los más recientes para evitar listas enormes */}
          {filteredOrders.length > 100 && (
            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Mostrando {showAllOrders ? filteredOrders.length : 100} de {filteredOrders.length} pedidos.{' '}
              <button
                type="button"
                onClick={() => setShowAllOrders(!showAllOrders)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                {showAllOrders ? 'Ver solo los más recientes' : 'Ver todos'}
              </button>
            </div>
          )}

          {isMobile ? (
            // Vista móvil: Grid tipo tablero de ajedrez
            <div style={{ 
              background: 'var(--bg-secondary)', 
              borderRadius: '1rem', 
              border: '1px solid var(--border)',
              padding: '1rem'
            }}>
              {visibleOrders.length === 0 ? (
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {visibleOrders.map((order: Order, index: number) => {
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
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          position: 'relative',
                          overflow: 'hidden',
                          gap: '1rem'
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
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '24px'
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
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                          <div style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {order.productName || 'Producto'}
                          </div>
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
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          gap: '0.25rem',
                          minWidth: '80px'
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
                            fontWeight: 600,
                            padding: '0.25rem 0.5rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '0.25rem'
                          }}>
                            {statusBadge.text}
                          </div>
                        </div>
                        
                        {/* Botones de acción */}
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'center',
                          minWidth: 'fit-content'
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
                                background: 'rgba(255, 255, 255, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '0.375rem',
                                padding: '0.375rem 0.625rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: 'white',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                              }}
                              title="Cancelar"
                            >
                              <XCircle size={12} />
                              <span>Cancelar</span>
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
                              background: 'rgba(239, 68, 68, 0.9)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '0.375rem',
                              padding: '0.375rem 0.625rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem',
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              color: 'white',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
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
              {visibleOrders.length === 0 ? (
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
                          checked={visibleOrders.length > 0 && visibleOrders.every(o => selectedOrders.has(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrders(new Set(visibleOrders.map(o => o.id)));
                            } else {
                              const filteredIds = new Set(visibleOrders.map(o => o.id));
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
                                      const orderRef = dbRef(realtimeDb, `orders/${order.id}`);
                                      await remove(orderRef);
                                      
                                      // Pequeño delay para asegurar que Firebase procese la eliminación
                                      await new Promise(resolve => setTimeout(resolve, 200));
                                      
                                      const remainingOrders = orders.filter(o => o.id !== order.id);
                                      setOrders(remainingOrders);
                                      logOrderAction('Pedido eliminado', order.id, user?.id, user?.username, { 
                                        status: order.status,
                                        actionType: 'delete'
                                      });
                                      alert('✅ Pedido eliminado de Firebase');
                                    } catch (error: any) {
                                      console.error('❌ Error eliminando pedido:', error);
                                      if (error?.code === 'PERMISSION_DENIED') {
                                        alert(`❌ Error de permisos al eliminar el pedido.\n\nVerifica que:\n- Eres administrador\n- isAdmin está sincronizado en Realtime Database\n\nError: ${error.message}`);
                                      } else {
                                        alert(`❌ Error al eliminar el pedido: ${error.message || 'Error desconocido'}`);
                                      }
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

      {/* Envíos Tab */}
      {activeTab === 'shipments' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '1.5rem' : '2rem'
                }}
              >
                Gestión de Envíos
              </h2>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}
              >
                Visualizá y actualizá el estado de todos los envíos de forma clara.
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}
            >
              <input
                type="text"
                placeholder="Buscar por pedido, usuario o tracking..."
                value={shipmentSearch}
                onChange={(e) => setShipmentSearch(e.target.value)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  minWidth: isMobile ? '180px' : '260px',
                  fontSize: '0.9rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              <select
                value={shipmentStatusFilter}
                onChange={(e) =>
                  setShipmentStatusFilter(e.target.value as any)
                }
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--border)',
                  minWidth: '160px',
                  fontSize: '0.9rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="preparing">Preparando</option>
                <option value="ready_to_ship">Listo para enviar</option>
                <option value="in_transit">En tránsito</option>
                <option value="delayed">Con demora</option>
                <option value="delivered">Entregado</option>
                <option value="returned">Devuelto</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Grid de tarjetas de envíos */}
          {/* Grid de tarjetas de envíos */}
          {/* Limitar visualmente a los más recientes para evitar grillas enormes */}
          {shipments.length > 100 && (
            <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Mostrando {showAllShipments ? shipments.length : 100} de {shipments.length} envíos.{' '}
              <button
                type="button"
                onClick={() => setShowAllShipments(!showAllShipments)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                {showAllShipments ? 'Ver solo los más recientes' : 'Ver todos'}
              </button>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile
                ? '1fr'
                : 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {shipments
              .filter((s) => {
                if (shipmentStatusFilter !== 'all') {
                  return s.status === shipmentStatusFilter;
                }
                return true;
              })
              .filter((s) => {
                if (!shipmentSearch.trim()) return true;
                const q = shipmentSearch.toLowerCase();
                return (
                  s.orderId.toLowerCase().includes(q) ||
                  s.userName.toLowerCase().includes(q) ||
                  s.productName.toLowerCase().includes(q) ||
                  (s.trackingNumber || '').toLowerCase().includes(q)
                );
              })
              .slice(0, showAllShipments ? shipments.length : 100)
              .map((s) => {
                const created =
                  s.createdAt instanceof Date
                    ? s.createdAt
                    : new Date(s.createdAt as any);

                const getStatusLabel = (status: string) => {
                  switch (status) {
                    case 'pending':
                      return { label: 'Pendiente', className: 'badge-warning' };
                    case 'preparing':
                      return {
                        label: 'Preparando',
                        className: 'badge-info'
                      };
                    case 'ready_to_ship':
                      return {
                        label: 'Listo para enviar',
                        className: 'badge-info'
                      };
                    case 'in_transit':
                      return {
                        label: 'En tránsito',
                        className: 'badge-primary'
                      };
                    case 'delayed':
                      return {
                        label: 'Con demora',
                        className: 'badge-warning'
                      };
                    case 'delivered':
                      return {
                        label: 'Entregado',
                        className: 'badge-success'
                      };
                    case 'returned':
                      return {
                        label: 'Devuelto',
                        className: 'badge-secondary'
                      };
                    case 'cancelled':
                      return {
                        label: 'Cancelado',
                        className: 'badge-danger'
                      };
                    default:
                      return { label: status, className: 'badge-secondary' };
                  }
                };

                const statusInfo = getStatusLabel(s.status);

                const handleQuickStatusChange = async (
                  status: ShipmentStatus
                ) => {
                  try {
                    const updates: Partial<Shipment> = { status };
                    if (status === 'in_transit' && !s.shippedAt) {
                      updates.shippedAt = new Date().toISOString();
                    }
                    if (status === 'delivered' && !s.deliveredAt) {
                      updates.deliveredAt = new Date().toISOString();
                    }
                    await updateShipmentRecord(s.id, updates);

                    // Disparar notificaciones basadas en reglas para eventos de envío
                    if (status === 'in_transit') {
                      triggerRuleBasedNotification(
                        'order_shipped',
                        s.userId,
                        addNotification,
                        {
                          orderId: s.orderId,
                          productName: s.productName,
                          trackingNumber: updates.trackingNumber || s.trackingNumber
                        }
                      );
                    }
                    if (status === 'delivered') {
                      triggerRuleBasedNotification(
                        'order_delivered',
                        s.userId,
                        addNotification,
                        {
                          orderId: s.orderId,
                          productName: s.productName
                        }
                      );
                    }
                  } catch (error) {
                    console.error('Error actualizando envío:', error);
                    alert(
                      'No se pudo actualizar el estado del envío. Intentá nuevamente.'
                    );
                  }
                };

                return (
                  <div
                    key={s.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: '1rem',
                      padding: '1.25rem',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '0.25rem'
                          }}
                        >
                          Pedido #{s.orderId}
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {s.productName}
                        </h3>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.25rem'
                          }}
                        >
                          Cliente: <strong>{s.userName}</strong>
                        </div>
                      </div>
                      <span
                        className={`badge ${statusInfo.className}`}
                        style={{ flexShrink: 0 }}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      <div>
                        Creado:{' '}
                        {created.toLocaleString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {s.shippedAt && (
                        <div>
                          Enviado:{' '}
                          {new Date(s.shippedAt as any).toLocaleString(
                            'es-AR',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </div>
                      )}
                      {s.deliveredAt && (
                        <div>
                          Entregado:{' '}
                          {new Date(s.deliveredAt as any).toLocaleString(
                            'es-AR',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </div>
                      )}
                      <div>
                        Método:{' '}
                        <strong>
                          {s.deliveryMethod === 'shipping'
                            ? 'Envío a domicilio'
                            : s.deliveryMethod === 'pickup'
                            ? 'Retiro'
                            : 'Email'}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '0.5rem',
                        paddingTop: '0.5rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}
                      >
                        <label
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Tracking
                        </label>
                        <input
                          type="text"
                          defaultValue={s.trackingNumber || ''}
                          placeholder="Número de seguimiento"
                          onBlur={async (e) => {
                            const value = e.target.value.trim();
                            try {
                              await updateShipmentRecord(s.id, {
                                trackingNumber: value || undefined
                              });
                            } catch (error) {
                              console.error(
                                'Error actualizando tracking:',
                                error
                              );
                            }
                          }}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                        <input
                          type="text"
                          defaultValue={s.trackingUrl || ''}
                          placeholder="URL de seguimiento (opcional)"
                          onBlur={async (e) => {
                            const value = e.target.value.trim();
                            try {
                              await updateShipmentRecord(s.id, {
                                trackingUrl: value || undefined
                              });
                            } catch (error) {
                              console.error(
                                'Error actualizando URL de tracking:',
                                error
                              );
                            }
                          }}
                          style={{
                            padding: '0.6rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border)',
                            fontSize: '0.85rem',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginTop: '0.25rem'
                        }}
                      >
                        {['pending', 'preparing'].includes(s.status) && (
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem'
                            }}
                            onClick={() =>
                              handleQuickStatusChange('ready_to_ship')
                            }
                          >
                            Marcar listo para enviar
                          </button>
                        )}
                        {['ready_to_ship', 'delayed'].includes(s.status) && (
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem'
                            }}
                            onClick={() =>
                              handleQuickStatusChange('in_transit')
                            }
                          >
                            Marcar en tránsito
                          </button>
                        )}
                        {['in_transit', 'delayed'].includes(s.status) && (
                          <button
                            className="btn btn-primary"
                            style={{
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.8rem'
                            }}
                            onClick={() =>
                              handleQuickStatusChange('delivered')
                            }
                          >
                            Marcar entregado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {shipments.length === 0 && (
            <div
              style={{
                marginTop: '2rem',
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: '1rem',
                border: '1px dashed var(--border)'
              }}
            >
              <Truck
                size={48}
                color="var(--text-tertiary)"
                style={{ marginBottom: '1rem' }}
              />
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Aún no hay envíos
              </h3>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}
              >
                Cuando crees envíos desde los pedidos, aparecerán aquí para
                gestionar su estado.
              </p>
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
            {!isMobile && (
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
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.9375rem'
                  }}
                >
                  <XCircle size={18} />
                  Desactivar Todos
                </button>
                <button
                  onClick={handleClearBotOrders}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.9375rem'
                  }}
                >
                  <Trash2 size={18} />
                  Limpiar Pedidos de Bots
                </button>
                <button
                  onClick={() => {
                    setBotForm({
                      name: '',
                      balance: 10000,
                      intervalMin: 5,
                      intervalMax: 15,
                      maxBidAmount: 5000,
                      minIncrement: 500,
                      targetAuctions: []
                    });
                    setShowBotForm(true);
                  }}
                  className="btn btn-primary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.875rem 1.25rem',
                    fontSize: '0.9375rem'
                  }}
                >
                  <Plus size={18} />
                  Nuevo Bot
                </button>
              </div>
            )}
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

          {/* Botones de acción - Solo en móvil, debajo de los cuadros */}
          {isMobile && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '0.75rem',
              marginBottom: '2rem',
              width: '100%'
            }}>
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
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                <XCircle size={18} />
                Desactivar Todos
              </button>
              <button
                onClick={handleClearBotOrders}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                <Trash2 size={18} />
                Limpiar Pedidos de Bots
              </button>
              <button
                onClick={() => {
                  setBotForm({
                    name: '',
                    balance: 10000,
                    intervalMin: 5,
                    intervalMax: 15,
                    maxBidAmount: 5000,
                    minIncrement: 500,
                    targetAuctions: []
                  });
                  setShowBotForm(true);
                }}
                className="btn btn-primary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.875rem 1rem',
                  fontSize: '0.875rem',
                  width: '100%'
                }}
              >
                <Plus size={18} />
                Nuevo Bot
              </button>
            </div>
          )}

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
                      minIncrement: 500,
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
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Incremento Mínimo por Oferta
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={botForm.minIncrement}
                      onChange={(e) => setBotForm({ ...botForm, minIncrement: Number(e.target.value) })}
                      placeholder="500"
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
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      El bot ofertará incrementando de a este monto (por defecto: $500)
                    </small>
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
                        minIncrement: 500,
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
              ) : isMobile ? (
                // Vista móvil: Lista horizontal
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '1rem', 
                  border: '1px solid var(--border)',
                  padding: '1rem'
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    {filteredBots.map((bot: any, index: number) => {
                      const bidCount = getBotBidCount(bot.id);
                      const botColor = bot.isActive 
                        ? 'linear-gradient(135deg, #10b981, #059669)' 
                        : 'linear-gradient(135deg, #6b7280, #4b5563)';
                      
                      return (
                        <div
                          key={`bot-${bot.id}-${index}`}
                          style={{
                            background: botColor,
                            color: 'white',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            position: 'relative',
                            overflow: 'hidden',
                            gap: '1rem'
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
                          {/* Icono y nombre */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                            <Bot size={20} style={{ opacity: 0.9, flexShrink: 0 }} />
                          <div style={{
                              fontSize: '0.875rem', 
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                          }}>
                              {bot.name}
                          </div>
                            <div style={{ 
                              fontSize: '0.625rem', 
                              opacity: 0.9, 
                              fontWeight: 600,
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(255, 255, 255, 0.2)',
                              borderRadius: '0.25rem',
                              whiteSpace: 'nowrap'
                            }}>
                              {bot.isActive ? '✅ Activo' : '⏸️ Inactivo'}
                            </div>
                          </div>
                          
                          {/* Balance y ofertas */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-end',
                            gap: '0.25rem',
                            minWidth: '100px'
                          }}>
                            <div style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 700,
                              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                            }}>
                              {formatCurrency(bot.balance)}
                            </div>
                            <div style={{ 
                              fontSize: '0.625rem', 
                              opacity: 0.9,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}>
                              <TrendingUp size={10} />
                              {bidCount} ofertas
                            </div>
                          </div>
                          
                          {/* Botones de acción */}
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            alignItems: 'center',
                            minWidth: 'fit-content'
                          }}
                          onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newBalance = prompt(`Recargar balance para "${bot.name}"\n\nBalance actual: ${formatCurrency(bot.balance)}\n\nIngresá el nuevo balance:`, bot.balance.toString());
                                if (newBalance && !isNaN(Number(newBalance)) && Number(newBalance) >= 0) {
                                  updateBot(bot.id, { balance: Number(newBalance) });
                                  logAdminAction(`Balance recargado: ${bot.name} - ${formatCurrency(bot.balance)} → ${formatCurrency(Number(newBalance))}`, user?.id, user?.username);
                                }
                              }}
                              style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '0.375rem',
                                padding: '0.375rem 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: 'white',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                              }}
                              title="Recargar"
                            >
                              <DollarSign size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`¿Eliminar bot "${bot.name}"?\n\nEsta acción no se puede deshacer.`)) {
                                  deleteBot(bot.id);
                                  logAdminAction(`Bot eliminado: ${bot.name}`, user?.id, user?.username);
                                }
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.9)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '0.375rem',
                                padding: '0.375rem 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.25rem',
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                color: 'white',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Vista desktop: Tabla tradicional
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
            alignItems: 'flex-start',
              justifyContent: 'center',
            zIndex: 100000,
            paddingTop: isMobile ? '80px' : '60px',
            paddingLeft: isMobile ? '1rem' : '2rem',
            paddingRight: isMobile ? '1rem' : '2rem',
            paddingBottom: isMobile ? '1rem' : '2rem',
            overflow: 'auto'
            }}
            onClick={() => setSelectedUnifiedMessage(null)}
            >
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '700px',
                maxHeight: 'calc(100vh - 80px)',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border)',
                marginTop: 0
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

      {/* Utilidades Tab */}
      {activeTab === 'utilities' && (
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
                🛠️ Utilidades
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Calculadoras y herramientas útiles para gestionar tu negocio
              </p>
            </div>
          </div>

          {/* Grid de Utilidades */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Calculadora de Costos y Ganancia */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Calculadora de Costos
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Calcula precio de venta y ganancia
                  </p>
                </div>
              </div>

              <CostCalculator />
            </div>

            {/* Calculadora de Margen */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Percent size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Calculadora de Margen
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Calcula margen de ganancia
                  </p>
                </div>
              </div>

              <MarginCalculator />
            </div>

            {/* Calculadora de Descuentos */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <TrendingDown size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Calculadora de Descuentos
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Calcula precios con descuento
                  </p>
                </div>
              </div>

              <DiscountCalculator />
            </div>

            {/* Generador de Códigos */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Package2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Generador de Códigos
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Genera códigos de descuento
                  </p>
                </div>
              </div>

              <CodeGenerator />
            </div>

            {/* Generador de IDs ULID con prefijo */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #0ea5e9, #0369a1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Activity size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Generador de IDs ULID
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    PRD / SUB / ORD + fecha + ULID ordenable, ideal para e‑commerce y subastas
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  Formato recomendado:{' '}
                  <code style={{ fontSize: '0.8rem' }}>{'{TIPO}-{FECHA}-{ULID}'}</code>
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {['PRD', 'SUB', 'ORD'].map((prefix) => (
                    <button
                      key={prefix}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        const datePart = `${yyyy}${mm}${dd}`;
                        const ulid = generateUlid();
                        const id = `${prefix}-${datePart}-${ulid}`;
                        navigator.clipboard
                          .writeText(id)
                          .then(() => {
                            alert(`ID copiado al portapapeles:\n\n${id}`);
                          })
                          .catch(() => {
                            alert(`ID generado:\n\n${id}`);
                          });
                      }}
                    >
                      {prefix === 'PRD' && 'PRD - Producto'}
                      {prefix === 'SUB' && 'SUB - Subasta'}
                      {prefix === 'ORD' && 'ORD - Orden'}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Ejemplos:
                  <div style={{ marginTop: '0.25rem' }}>
                    <code style={{ display: 'block', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                      PRD-20251125-01HF3G2M6QH9WZ9T2J5C1NSP2M
                    </code>
                    <code style={{ display: 'block', marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                      SUB-20251125-01HF3G2N4XP7G5Y8Z1VR4P3HJD
                    </code>
                    <code style={{ display: 'block', wordBreak: 'break-all' }}>
                      ORD-20251125-01HF3G2R5C9KBDQG8NQ2RF94VT
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* Gestión rápida de cupones */}
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Percent size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>
                    Cupones de Descuento
                  </h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Crear y testear códigos de descuento rápidamente
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    Código (se guarda en mayúsculas)
                  </label>
                  <input
                    type="text"
                    value={couponDraft.code}
                    onChange={(e) =>
                      setCouponDraft((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase()
                      }))
                    }
                    placeholder="EJ: BIENVENIDO10"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Tipo de descuento
                    </label>
                    <select
                      value={couponDraft.discountType || 'percent'}
                      onChange={(e) =>
                        setCouponDraft((prev) => ({
                          ...prev,
                          discountType: e.target.value as Coupon['discountType']
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="percent">% Porcentaje</option>
                      <option value="amount">$ Monto fijo</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Valor
                    </label>
                    <input
                      type="number"
                      value={couponDraft.value ?? 0}
                      onChange={(e) =>
                        setCouponDraft((prev) => ({
                          ...prev,
                          value: Number(e.target.value) || 0
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Mínimo de compra (opcional)
                    </label>
                    <input
                      type="number"
                      value={couponDraft.minAmount ?? ''}
                      onChange={(e) =>
                        setCouponDraft((prev) => ({
                          ...prev,
                          minAmount: e.target.value ? Number(e.target.value) : undefined
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>
                      Máx. usos (opcional)
                    </label>
                    <input
                      type="number"
                      value={couponDraft.maxUses ?? ''}
                      onChange={(e) =>
                        setCouponDraft((prev) => ({
                          ...prev,
                          maxUses: e.target.value ? Number(e.target.value) : undefined
                        }))
                      }
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={couponDraft.active ?? true}
                    onChange={(e) =>
                      setCouponDraft((prev) => ({
                        ...prev,
                        active: e.target.checked
                      }))
                    }
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Cupón activo
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      if (!couponDraft.code || !couponDraft.value) {
                        alert('Completá al menos el código y el valor del cupón.');
                        return;
                      }
                      const amountTest = 50000;
                      try {
                        const result = await validateCouponForAmount(
                          couponDraft.code,
                          amountTest
                        );
                        if (!result.valid) {
                          alert(
                            `Cupón inválido para un carrito de prueba de ${amountTest.toLocaleString(
                              'es-AR',
                              { style: 'currency', currency: 'ARS' }
                            )}:\n\n${result.errorMessage}`
                          );
                          return;
                        }
                        alert(
                          `Cupón válido.\n\nDescuento para ${amountTest.toLocaleString(
                            'es-AR',
                            { style: 'currency', currency: 'ARS' }
                          )}: ${result.discountAmount.toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS'
                          })}\nTotal final: ${result.finalAmount.toLocaleString('es-AR', {
                            style: 'currency',
                            currency: 'ARS'
                          })}`
                        );
                      } catch (err: any) {
                        console.error('Error testeando cupón:', err);
                        alert(
                          err?.message || 'No se pudo probar el cupón. Revisá los datos.'
                        );
                      }
                    }}
                  >
                    Probar Cupón
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      if (!couponDraft.code || !couponDraft.value) {
                        alert('Completá al menos el código y el valor del cupón.');
                        return;
                      }
                      try {
                        const normalized = couponDraft.code.trim().toUpperCase();
                        const couponRef = dbRef(realtimeDb, `coupons/${normalized}`);
                        await firebaseSet(couponRef, {
                          code: normalized,
                          description: couponDraft.description || '',
                          discountType: couponDraft.discountType || 'percent',
                          value: couponDraft.value,
                          minAmount: couponDraft.minAmount ?? null,
                          maxUses: couponDraft.maxUses ?? null,
                          usedCount: 0,
                          active: couponDraft.active ?? true,
                          createdAt: new Date().toISOString()
                        });
                        alert('✅ Cupón guardado en Firebase');
                      } catch (err: any) {
                        console.error('Error guardando cupón:', err);
                        alert(err?.message || '❌ Error al guardar el cupón.');
                      }
                    }}
                  >
                    Guardar Cupón
                  </button>
                </div>
              </div>
            </div>
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
              {/* Sección de Bienvenida */}
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '2px solid var(--primary)',
                borderStyle: 'dashed'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  marginBottom: '1rem', 
                  color: 'var(--primary)', 
                  fontSize: isMobile ? '1rem' : '1.125rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>👋</span>
                  Texto de Bienvenida
                </h4>
                <p style={{ 
                  margin: 0, 
                  marginBottom: '1rem', 
                  color: 'var(--text-secondary)', 
                  fontSize: isMobile ? '0.875rem' : '0.9375rem' 
                }}>
                  Este es el texto principal que aparece en la página de inicio. Los usuarios verán este mensaje cuando ingresen a tu sitio.
                </p>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Título de Bienvenida *
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
                      fontSize: isMobile ? '16px' : '1rem',
                      fontWeight: 500
                  }}
                />
                  <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    color: 'var(--text-secondary)', 
                    fontSize: '0.75rem' 
                  }}>
                    Este texto aparecerá como el título principal en la página de inicio
                  </p>
                </div>
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
                          
                          // Notificación basada en reglas para cambios de estado de ticket
                          if (selectedTicket.userId) {
                            const statusLabel =
                              newStatus === 'visto'
                                ? 'Visto'
                                : newStatus === 'revision'
                                ? 'En Revisión'
                                : 'Resuelto';

                            triggerRuleBasedNotification(
                              'ticket_updated',
                              selectedTicket.userId,
                              addNotification,
                              {
                                ticketNumber: selectedTicket.ticketNumber,
                                status: newStatus,
                                statusLabel
                              }
                            );
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
                        
                        // Notificación basada en reglas si se agregó una respuesta
                        if (ticketResponse && selectedTicket.userId) {
                          const statusLabel =
                            selectedTicket.status === 'visto'
                              ? 'Visto'
                              : selectedTicket.status === 'revision'
                              ? 'En Revisión'
                              : 'Resuelto';

                          triggerRuleBasedNotification(
                            'ticket_updated',
                            selectedTicket.userId,
                            addNotification,
                            {
                              ticketNumber: selectedTicket.ticketNumber,
                              status: selectedTicket.status,
                              statusLabel,
                              hasResponse: true
                            }
                          );
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

          {/* Sección de Gestión de Reglas de Notificaciones */}
          <div style={{
            background: 'var(--bg-secondary)',
            padding: '1.5rem',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            marginTop: '2rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-primary)',
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Bell size={24} />
                  Reglas de Notificaciones Automáticas
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                  Gestioná las acciones que disparan notificaciones automáticas (campana, globo de conversación, mensajes, etc.)
                </p>
        </div>
              <button
                onClick={() => {
                  setRuleForm({
                    name: '',
                    eventType: 'new_message',
                    title: '',
                    message: '',
                    link: '',
                    active: true,
                    conditions: {
                      minAmount: undefined,
                      maxAmount: undefined,
                      userRoles: [],
                      productTypes: []
                    }
                  });
                  setSelectedRule(null);
                  setShowRuleEditor(true);
                }}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={20} />
                Nueva Regla
              </button>
            </div>

            {/* Filtros y búsqueda */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="Buscar reglas..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
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
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setRuleFilter('all')}
                  className={ruleFilter === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                >
                  Todas
                </button>
                <button
                  onClick={() => setRuleFilter('active')}
                  className={ruleFilter === 'active' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                >
                  Activas
                </button>
                <button
                  onClick={() => setRuleFilter('inactive')}
                  className={ruleFilter === 'inactive' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}
                >
                  Inactivas
                </button>
              </div>
            </div>

            {/* Información sobre reglas del sistema */}
            <div style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '0.5rem',
              border: '1px solid var(--border)',
              marginBottom: '1.5rem'
            }}>
              <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                <strong>ℹ️ Información:</strong> Las reglas marcadas con <span style={{
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}>⚙️ Sistema</span> son acciones automáticas que ya están implementadas en el código (ej: cuando se gana una subasta, cuando el admin envía un mensaje, etc.). Estas reglas muestran qué notificaciones se envían automáticamente. Podés crear reglas personalizadas basadas en ellas para personalizar los mensajes.
              </p>
            </div>

            {/* Lista de reglas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notificationRules.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No hay reglas de notificaciones. Las reglas del sistema se mostrarán automáticamente.
                </p>
              ) : (
                notificationRules
                  .filter((rule) => {
                    const matchesFilter = ruleFilter === 'all' || 
                      (ruleFilter === 'active' && rule.active) ||
                      (ruleFilter === 'inactive' && !rule.active);
                    const matchesSearch = !ruleSearch || 
                      rule.name?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                      rule.title?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                      rule.message?.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                      rule.eventType?.toLowerCase().includes(ruleSearch.toLowerCase());
                    return matchesFilter && matchesSearch;
                  })
                  .map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        padding: '1rem',
                        background: rule.active ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                        borderRadius: '0.5rem',
                        border: `1px solid ${rule.active ? 'var(--success)' : 'var(--border)'}`,
                        opacity: rule.active ? 1 : 0.7
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>{rule.name}</h4>
                            {rule.isSystemRule && (
                              <span style={{
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}>
                                <span>⚙️</span> Sistema
                              </span>
                            )}
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: rule.active ? 'var(--success)' : 'var(--text-secondary)',
                              color: 'white'
                            }}>
                              {rule.active ? 'Activa' : 'Inactiva'}
                            </span>
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'var(--primary)',
                              color: 'white',
                              textTransform: 'none'
                            }}>
                              {rule.eventType}
                            </span>
                            {/* Etiqueta por categoría de evento */}
                            <span style={{
                              padding: '0.125rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background:
                                rule.eventType === 'auction_won' || rule.eventType === 'auction_outbid'
                                  ? 'rgba(236, 72, 153, 0.15)'
                                  : rule.eventType === 'purchase' || rule.eventType === 'payment_reminder'
                                  ? 'rgba(34, 197, 94, 0.15)'
                                  : rule.eventType === 'order_shipped' ||
                                    rule.eventType === 'order_delivered' ||
                                    rule.eventType === 'order_expired'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : rule.eventType === 'ticket_updated'
                                  ? 'rgba(249, 115, 22, 0.15)'
                                  : 'rgba(148, 163, 184, 0.15)',
                              color:
                                rule.eventType === 'auction_won' || rule.eventType === 'auction_outbid'
                                  ? '#ec4899'
                                  : rule.eventType === 'purchase' || rule.eventType === 'payment_reminder'
                                  ? '#22c55e'
                                  : rule.eventType === 'order_shipped' ||
                                    rule.eventType === 'order_delivered' ||
                                    rule.eventType === 'order_expired'
                                  ? '#3b82f6'
                                  : rule.eventType === 'ticket_updated'
                                  ? '#f97316'
                                  : '#64748b'
                            }}>
                              {rule.eventType === 'auction_won' || rule.eventType === 'auction_outbid'
                                ? 'Subastas'
                                : rule.eventType === 'purchase' || rule.eventType === 'payment_reminder'
                                ? 'Compras'
                                : rule.eventType === 'order_shipped' ||
                                  rule.eventType === 'order_delivered' ||
                                  rule.eventType === 'order_expired'
                                ? 'Envíos'
                                : rule.eventType === 'ticket_updated'
                                ? 'Tickets'
                                : 'Sistema'}
                            </span>
                          </div>
                          <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
                            Título: {rule.title}
                          </p>
                          <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Mensaje: {rule.message.substring(0, 100)}{rule.message.length > 100 ? '...' : ''}
                          </p>
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                            <span>Creada: {rule.createdAt ? new Date(rule.createdAt).toLocaleString('es-AR') : 'N/A'}</span>
                            <span>Actualizada: {rule.updatedAt ? new Date(rule.updatedAt).toLocaleString('es-AR') : 'N/A'}</span>
                            {rule.conditions && (
                              <>
                                {rule.conditions.minAmount && <span>Mín: ${rule.conditions.minAmount}</span>}
                                {rule.conditions.maxAmount && <span>Máx: ${rule.conditions.maxAmount}</span>}
                                {rule.conditions.userRoles && rule.conditions.userRoles.length > 0 && (
                                  <span>Roles: {rule.conditions.userRoles.join(', ')}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              if (rule.isSystemRule) {
                                // Para reglas del sistema, crear una copia personalizada
                                if (window.confirm(`Las reglas del sistema no se pueden editar directamente.\n\n¿Querés crear una regla personalizada basada en esta?`)) {
                                  setSelectedRule(null);
                                  setRuleForm({
                                    name: `${rule.name} (Personalizada)`,
                                    eventType: rule.eventType,
                                    title: rule.title,
                                    message: rule.message,
                                    link: rule.link || '',
                                    active: rule.active,
                                    conditions: rule.conditions ? {
                                      minAmount: rule.conditions.minAmount,
                                      maxAmount: rule.conditions.maxAmount,
                                      userRoles: rule.conditions.userRoles || [],
                                      productTypes: rule.conditions.productTypes || []
                                    } : {
                                      minAmount: undefined as number | undefined,
                                      maxAmount: undefined as number | undefined,
                                      userRoles: [] as ('user' | 'admin')[],
                                      productTypes: [] as ('auction' | 'store')[]
                                    }
                                  });
                                  setShowRuleEditor(true);
                                }
                              } else {
                                setSelectedRule(rule);
                                setRuleForm({
                                  name: rule.name,
                                  eventType: rule.eventType,
                                  title: rule.title,
                                  message: rule.message,
                                  link: rule.link || '',
                                  active: rule.active,
                                  conditions: rule.conditions ? {
                                    minAmount: rule.conditions.minAmount,
                                    maxAmount: rule.conditions.maxAmount,
                                    userRoles: rule.conditions.userRoles || [],
                                    productTypes: rule.conditions.productTypes || []
                                  } : {
                                    minAmount: undefined as number | undefined,
                                    maxAmount: undefined as number | undefined,
                                    userRoles: [] as ('user' | 'admin')[],
                                    productTypes: [] as ('auction' | 'store')[]
                                  }
                                });
                                setShowRuleEditor(true);
                              }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            title={rule.isSystemRule ? 'Crear copia personalizada' : 'Editar regla'}
                          >
                            <Edit size={16} />
                          </button>
                          {!rule.isSystemRule && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`¿Eliminar la regla "${rule.name}"?`)) {
                                  try {
                                    await deleteNotificationRule(rule.id);
                                    setNotificationRules(notificationRules.filter((r) => r.id !== rule.id));
                                    alert('✅ Regla eliminada');
                                  } catch (error: any) {
                                    console.error('Error eliminando regla:', error);
                                    alert(`❌ ${error.message || 'Error al eliminar'}`);
                                  }
                                }
                              }}
                              className="btn btn-danger"
                              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Modal de creación/edición de regla */}
          {showRuleEditor && (
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
              zIndex: 100000,
              padding: isMobile ? '1rem' : '2rem'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowRuleEditor(false);
              }
            }}
            >
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '1rem',
                padding: '2rem',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                border: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                    {selectedRule ? 'Editar Regla de Notificación' : 'Nueva Regla de Notificación'}
                  </h3>
                  <button
                    onClick={() => setShowRuleEditor(false)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Nombre de la regla */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Nombre de la Regla *
                    </label>
                    <input
                      type="text"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="Ej: Notificación cuando alguien gana una subasta"
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
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Un nombre descriptivo para identificar esta regla
                    </p>
                  </div>

                  {/* Tipo de evento */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Tipo de Evento que Dispara la Notificación *
                    </label>
                    <select
                      value={ruleForm.eventType}
                      onChange={(e) => setRuleForm({ ...ruleForm, eventType: e.target.value as NotificationRule['eventType'] })}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: isMobile ? '16px' : '1rem'
                      }}
                    >
                      <option value="new_message">Nuevo Mensaje (globo de conversación)</option>
                      <option value="auction_won">Subasta Ganada</option>
                      <option value="auction_outbid">Fuiste Superado en Subasta</option>
                      <option value="purchase">Compra Realizada</option>
                      <option value="payment_reminder">Recordatorio de Pago</option>
                      <option value="order_shipped">Pedido Enviado</option>
                      <option value="order_delivered">Pedido Entregado</option>
                      <option value="order_expired">Pedido Expirado</option>
                      <option value="ticket_updated">Ticket Actualizado (Centro de Ayuda)</option>
                    </select>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Seleccioná cuándo se debe disparar esta notificación automáticamente
                    </p>
                  </div>

                  {/* Título de la notificación */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Título de la Notificación *
                    </label>
                    <input
                      type="text"
                      value={ruleForm.title}
                      onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                      placeholder="Ej: 🎉 ¡Ganaste la subasta!"
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

                  {/* Mensaje de la notificación */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Mensaje de la Notificación *
                    </label>
                    <textarea
                      value={ruleForm.message}
                      onChange={(e) => setRuleForm({ ...ruleForm, message: e.target.value })}
                      rows={5}
                      placeholder="Ej: Ganaste '{{auctionTitle}}' por ${{amount}}. Tenés 48hs para pagar."
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
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Podés usar variables como {'{'}{'{'}auctionTitle{'}'}{'}'}, {'{'}{'{'}amount{'}'}{'}'}, {'{'}{'{'}username{'}'}{'}'}, etc.
                    </p>
                  </div>

                  {/* Enlace opcional */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      Enlace (opcional)
                    </label>
                    <input
                      type="text"
                      value={ruleForm.link}
                      onChange={(e) => setRuleForm({ ...ruleForm, link: e.target.value })}
                      placeholder="Ej: /subastas/{{auctionId}} o /notificaciones"
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

                  {/* Estado activo/inactivo */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={ruleForm.active}
                        onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.checked })}
                      />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        Regla Activa
                      </span>
                    </label>
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      Si está inactiva, esta regla no se ejecutará y no se enviarán notificaciones
                    </p>
                  </div>

                  {/* Condiciones opcionales */}
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border)'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>
                      Condiciones Opcionales
                    </h4>
                    <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Definí condiciones adicionales para cuándo se debe aplicar esta regla
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            Monto Mínimo
                          </label>
                          <input
                            type="number"
                            value={ruleForm.conditions.minAmount || ''}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              conditions: {
                                ...ruleForm.conditions,
                                minAmount: e.target.value ? Number(e.target.value) : undefined
                              }
                            })}
                            placeholder="Ej: 1000"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            Monto Máximo
                          </label>
                          <input
                            type="number"
                            value={ruleForm.conditions.maxAmount || ''}
                            onChange={(e) => setRuleForm({
                              ...ruleForm,
                              conditions: {
                                ...ruleForm.conditions,
                                maxAmount: e.target.value ? Number(e.target.value) : undefined
                              }
                            })}
                            placeholder="Ej: 50000"
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: isMobile ? '16px' : '0.9375rem'
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          Roles de Usuario
                        </label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={ruleForm.conditions.userRoles?.includes('user')}
                              onChange={(e) => {
                                const currentRoles = ruleForm.conditions.userRoles || [];
                                if (e.target.checked) {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      userRoles: [...currentRoles, 'user']
                                    }
                                  });
                                } else {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      userRoles: currentRoles.filter((r) => r !== 'user')
                                    }
                                  });
                                }
                              }}
                            />
                            <span>Usuarios</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={ruleForm.conditions.userRoles?.includes('admin')}
                              onChange={(e) => {
                                const currentRoles = ruleForm.conditions.userRoles || [];
                                if (e.target.checked) {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      userRoles: [...currentRoles, 'admin']
                                    }
                                  });
                                } else {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      userRoles: currentRoles.filter((r) => r !== 'admin')
                                    }
                                  });
                                }
                              }}
                            />
                            <span>Administradores</span>
                          </label>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Si no seleccionás ninguno, se aplica a todos los roles
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                          Tipos de Producto
                        </label>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={ruleForm.conditions.productTypes?.includes('auction')}
                              onChange={(e) => {
                                const currentTypes = ruleForm.conditions.productTypes || [];
                                if (e.target.checked) {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      productTypes: [...currentTypes, 'auction']
                                    }
                                  });
                                } else {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      productTypes: currentTypes.filter((t) => t !== 'auction')
                                    }
                                  });
                                }
                              }}
                            />
                            <span>Subastas</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={ruleForm.conditions.productTypes?.includes('store')}
                              onChange={(e) => {
                                const currentTypes = ruleForm.conditions.productTypes || [];
                                if (e.target.checked) {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      productTypes: [...currentTypes, 'store']
                                    }
                                  });
                                } else {
                                  setRuleForm({
                                    ...ruleForm,
                                    conditions: {
                                      ...ruleForm.conditions,
                                      productTypes: currentTypes.filter((t) => t !== 'store')
                                    }
                                  });
                                }
                              }}
                            />
                            <span>Tienda</span>
                          </label>
                        </div>
                        <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Si no seleccionás ninguno, se aplica a todos los tipos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowRuleEditor(false)}
                      className="btn btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!ruleForm.name || !ruleForm.title || !ruleForm.message) {
                          alert('⚠️ Por favor completá todos los campos requeridos');
                          return;
                        }

                        try {
                          if (selectedRule) {
                            // Editar regla existente
                            await updateNotificationRule(selectedRule.id, {
                              name: ruleForm.name,
                              eventType: ruleForm.eventType,
                              title: ruleForm.title,
                              message: ruleForm.message,
                              link: ruleForm.link || undefined,
                              active: ruleForm.active,
                              conditions: ruleForm.conditions
                            });
                            alert('✅ Regla actualizada correctamente');
                          } else {
                            // Crear nueva regla
                            await createNotificationRule({
                              name: ruleForm.name,
                              eventType: ruleForm.eventType,
                              title: ruleForm.title,
                              message: ruleForm.message,
                              link: ruleForm.link || undefined,
                              active: ruleForm.active,
                              conditions: ruleForm.conditions,
                              createdBy: user?.id || 'admin'
                            });
                            alert('✅ Regla creada correctamente');
                          }
                          
                          setShowRuleEditor(false);
                          setSelectedRule(null);
                        } catch (error) {
                          console.error('Error guardando regla:', error);
                          alert('❌ Error al guardar la regla');
                        }
                      }}
                      className="btn btn-primary"
                    >
                      <Save size={18} style={{ marginRight: '0.5rem' }} />
                      {selectedRule ? 'Guardar Cambios' : 'Crear Regla'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                              if (user?.id) {
                                loadMessageTemplates(user.id).then(setMessageTemplates);
                              }
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 100000,
            paddingTop: isMobile ? '80px' : '60px',
            paddingLeft: isMobile ? '1rem' : '2rem',
            paddingRight: isMobile ? '1rem' : '2rem',
            paddingBottom: isMobile ? '1rem' : '2rem',
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
              maxHeight: 'calc(100vh - 80px)',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border)',
              marginTop: 0
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
                  {selectedOrder.quantity && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      Cantidad: <strong>{selectedOrder.quantity}</strong> unidades
                    </div>
                  )}
                  {selectedOrder.unitsPerBundle && selectedOrder.unitsPerBundle > 0 && selectedOrder.bundles !== undefined && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {selectedOrder.unitsPerBundle} unidades por bulto, {selectedOrder.bundles} bultos disponibles
                    </div>
                  )}
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

      {/* Blog Tab - Gestión Completa del Blog */}
      {activeTab === 'blog' && (
        <div>
          {/* Header con título y botón crear */}
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
                fontSize: isMobile ? '1.5rem' : '2rem', 
                fontWeight: 700, 
                marginBottom: '0.5rem', 
                color: 'var(--text-primary)' 
              }}>
                Gestión del Blog
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: isMobile ? '0.875rem' : '1rem' }}>
                Crea, edita y gestiona las entradas del blog
              </p>
            </div>
            {!isEditingBlogPost && (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={importStaticArticles}
                  className="btn btn-secondary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.5rem'
                  }}
                  title="Importar los 6 artículos del blog desde el código"
                >
                  <Upload size={18} />
                  Importar Artículos ({staticBlogArticles.length})
                </button>
                <button
                  onClick={handleCreateBlogPost}
                  className="btn btn-primary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: isMobile ? '0.75rem 1rem' : '0.875rem 1.5rem'
                  }}
                >
                  <Plus size={18} />
                  Nueva Entrada
                </button>
              </div>
            )}
          </div>

          {isEditingBlogPost ? (
            /* Editor de Entrada de Blog */
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '1rem',
              padding: isMobile ? '1rem' : '2rem',
              border: '1px solid var(--border)'
            }}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedBlogPost?.id ? 'Editar Entrada' : 'Nueva Entrada'}
                </h3>
                <button
                  onClick={() => {
                    setIsEditingBlogPost(false);
                    setSelectedBlogPost(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  Cancelar
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Título */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Título *
                  </label>
                  <input
                    type="text"
                    value={selectedBlogPost?.title || ''}
                    onChange={(e) => setSelectedBlogPost({ ...selectedBlogPost, title: e.target.value })}
                    placeholder="Título de la entrada"
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                {/* Extracto */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Extracto (Resumen)
                  </label>
                  <textarea
                    value={selectedBlogPost?.excerpt || ''}
                    onChange={(e) => setSelectedBlogPost({ ...selectedBlogPost, excerpt: e.target.value })}
                    placeholder="Breve resumen de la entrada..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Categoría */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={selectedBlogPost?.category || ''}
                      onChange={(e) => setSelectedBlogPost({ ...selectedBlogPost, category: e.target.value })}
                      placeholder="Ej: Noticias, Tutoriales, Tips"
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Estado
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedBlogPost?.published || false}
                          onChange={(e) => setSelectedBlogPost({ ...selectedBlogPost, published: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ color: 'var(--text-primary)' }}>Publicado</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Imágenes */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                  {/* Banner */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Imagen Banner
                    </label>
                    {selectedBlogPost?.bannerImage && (
                      <img 
                        src={selectedBlogPost.bannerImage} 
                        alt="Banner" 
                        style={{ 
                          width: '100%', 
                          maxHeight: '200px', 
                          objectFit: 'cover', 
                          borderRadius: '0.5rem', 
                          marginBottom: '0.5rem' 
                        }} 
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadBlogImage(file, 'banner');
                      }}
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>

                  {/* Imagen Destacada */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Imagen Destacada
                    </label>
                    {selectedBlogPost?.featuredImage && (
                      <img 
                        src={selectedBlogPost.featuredImage} 
                        alt="Featured" 
                        style={{ 
                          width: '100%', 
                          maxHeight: '200px', 
                          objectFit: 'cover', 
                          borderRadius: '0.5rem', 
                          marginBottom: '0.5rem' 
                        }} 
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadBlogImage(file, 'featured');
                      }}
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                </div>

                {/* Contenido */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Contenido *
                  </label>
                  <textarea
                    value={selectedBlogPost?.content || ''}
                    onChange={(e) => setSelectedBlogPost({ ...selectedBlogPost, content: e.target.value })}
                    placeholder="Escribe el contenido de la entrada aquí. Puedes usar HTML básico para formatear el texto."
                    rows={15}
                    style={{
                      width: '100%',
                      padding: '0.875rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9375rem',
                      fontFamily: 'monospace',
                      resize: 'vertical'
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    💡 Tip: Puedes usar HTML básico para formatear el texto (p, h1-h6, strong, em, ul, ol, li, a, img, etc.)
                  </p>
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setIsEditingBlogPost(false);
                      setSelectedBlogPost(null);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '0.875rem 1.5rem' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBlogPost}
                    className="btn btn-primary"
                    style={{ padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Save size={18} />
                    Guardar Entrada
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Lista de Entradas del Blog */
            <div>
              {/* Filtros y búsqueda */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ 
                      position: 'absolute', 
                      left: '0.875rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-secondary)' 
                    }} />
                    <input
                      type="text"
                      placeholder="Buscar entradas..."
                      value={blogSearchTerm}
                      onChange={(e) => setBlogSearchTerm(e.target.value)}
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
                <select
                  value={blogFilterCategory}
                  onChange={(e) => setBlogFilterCategory(e.target.value)}
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
                  <option value="all">📋 Todas las categorías</option>
                  {blogCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <select
                  value={blogFilterPublished}
                  onChange={(e) => setBlogFilterPublished(e.target.value)}
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
                  <option value="all">📄 Todos los estados</option>
                  <option value="published">✅ Publicados</option>
                  <option value="draft">📝 Borradores</option>
                </select>
              </div>
              
              {/* Información de debug (solo en desarrollo) */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong>Debug:</strong> Total artículos: {blogPosts.length} | Filtrados: {filteredBlogPosts.length} | 
                  Búsqueda: "{blogSearchTerm}" | Categoría: {blogFilterCategory} | Estado: {blogFilterPublished}
                </div>
              )}

              {/* Lista de posts */}
              {filteredBlogPosts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <BookOpen size={64} style={{ marginBottom: '1rem', opacity: 0.5, color: 'var(--text-secondary)' }} />
                  <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>No hay entradas del blog</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    {blogPosts.length === 0 
                      ? `Importa los ${staticBlogArticles.length} artículos del blog o crea una nueva entrada` 
                      : `No se encontraron entradas con los filtros aplicados (${blogPosts.length} artículos en total)`}
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={importStaticArticles}
                      className="btn btn-secondary"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.875rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                      title={`Importar ${staticBlogArticles.length} artículos del blog desde el código fuente`}
                    >
                      <Upload size={20} />
                      Importar {staticBlogArticles.length} Artículos del Blog
                    </button>
                    <button
                      onClick={handleCreateBlogPost}
                      className="btn btn-primary"
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.875rem 1.5rem',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={20} />
                      Crear Nueva Entrada
                    </button>
                  </div>
                  {blogPosts.length > 0 && (
                    <div style={{ 
                      marginTop: '1.5rem', 
                      padding: '1rem', 
                      background: 'var(--bg-primary)', 
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)'
                    }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                        💡 <strong>Tip:</strong> Si no ves los artículos, verifica los filtros de categoría y estado arriba.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))', 
                  gap: '1.5rem' 
                }}>
                  {filteredBlogPosts.map((post: any) => {
                    const postDate = post.updatedAt || post.createdAt;
                    const formattedDate = postDate ? new Date(postDate).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }) : 'Sin fecha';
                    
                    return (
                      <div
                        key={post.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '1rem',
                          border: '1px solid var(--border)',
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {post.bannerImage && (
                          <img 
                            src={post.bannerImage} 
                            alt={post.title} 
                            style={{ 
                              width: '100%', 
                              height: '200px', 
                              objectFit: 'cover' 
                            }} 
                          />
                        )}
                        <div style={{ padding: '1.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                              <h3 style={{ 
                                fontSize: '1.125rem', 
                                fontWeight: 600, 
                                marginBottom: '0.5rem', 
                                color: 'var(--text-primary)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {post.title || 'Sin título'}
                              </h3>
                              {post.category && (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '0.25rem',
                                  background: 'var(--primary)',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  marginBottom: '0.5rem'
                                }}>
                                  {post.category}
                                </span>
                              )}
                            </div>
                            {post.published ? (
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.25rem',
                                background: 'var(--success)',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                Publicado
                              </span>
                            ) : (
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '0.25rem',
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                Borrador
                              </span>
                            )}
                          </div>
                          
                          {post.excerpt && (
                            <p style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '0.875rem', 
                              marginBottom: '1rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {post.excerpt}
                            </p>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border)'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              <div>{formattedDate}</div>
                              {post.author && (
                                <div style={{ marginTop: '0.25rem' }}>Por: {post.author}</div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleEditBlogPost(post)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteBlogPost(post.id)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', color: 'var(--error)' }}
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 100000,
          paddingTop: isMobile ? '80px' : '60px',
          paddingLeft: isMobile ? '1rem' : '2rem',
          paddingRight: isMobile ? '1rem' : '2rem',
          paddingBottom: isMobile ? '1rem' : '2rem',
          overflow: 'auto'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '1rem',
            padding: isMobile ? '1.5rem' : '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: 'calc(100vh - 80px)',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--border)',
            marginTop: 0
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
              ¿Cómo deseas republicar <strong>{'"'}{republishModal.auction.title}{'"'}</strong>?
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

    </div>
  );
};

export default AdminPanel;
