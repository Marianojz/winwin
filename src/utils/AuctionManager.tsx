import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Order } from '../types';
import { soundManager } from '../utils/sounds';
import { launchConfettiFromTop } from '../utils/celebrations';
import { createAutoMessage, saveMessage } from './messages';
import { loadUserPreferences, updateUserPreference } from './userPreferences';
import { get as firebaseGet, ref as dbRef } from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { triggerRuleBasedNotification } from './notificationRules';
import { generateUlid } from './helpers';

/**
 * Gestor de subastas que actualiza estados, crea órdenes y detecta ofertas superadas
 */
const AuctionManager = () => {
  const { auctions, setAuctions, addNotification, addOrder, updateAuction, user } = useStore();
  const previousBidsRef = useRef<Map<string, number>>(new Map());
  const celebratedWinsRef = useRef<Set<string>>(new Set()); // Rastrear victorias ya celebradas
  const processedEndedAuctionsRef = useRef<Set<string>>(new Set()); // Rastrear subastas ya procesadas al finalizar
  const processingAuctionsRef = useRef<Set<string>>(new Set()); // Rastrear subastas que se están procesando actualmente
  const waitingAuthLoggedRef = useRef<boolean>(false); // Para evitar logs repetidos

  useEffect(() => {
    // Cargar victorias ya celebradas desde Firebase
    const loadCelebratedWins = async () => {
      if (user) {
        try {
          const preferences = await loadUserPreferences(user.id);
          if (preferences.celebratedWins && Array.isArray(preferences.celebratedWins)) {
            preferences.celebratedWins.forEach((winKey: string) => {
              celebratedWinsRef.current.add(winKey);
            });
          }
        } catch (error) {
          console.error('❌ Error cargando celebraciones guardadas:', error);
        }
      }
    };
    
    loadCelebratedWins();
  }, [user]);

  useEffect(() => {
    // Inicializar el mapa de ofertas anteriores
    auctions.forEach(auction => {
      const key = `${auction.id}_${user?.id || 'anonymous'}`;
      if (auction.bids.length > 0 && user) {
        // Guardar la última oferta del usuario actual por subasta
        const userLastBid = auction.bids
          .filter(bid => bid.userId === user.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        if (userLastBid) {
          previousBidsRef.current.set(key, userLastBid.amount);
        }
      }
    });
  }, [auctions, user]);

  useEffect(() => {
    // Verificar usuario temprano para evitar ejecuciones innecesarias
    if (!user) {
      // Solo imprimir el mensaje una vez
      if (!waitingAuthLoggedRef.current) {
        console.log('⏳ Esperando autenticación del usuario antes de procesar subastas...');
        waitingAuthLoggedRef.current = true;
      }
      return; // Salir temprano si no hay usuario
    }
    
    // Resetear el flag cuando hay usuario
    waitingAuthLoggedRef.current = false;
    
    // ✅ NUEVO: LIMPIAR SUBASTAS CORRUPTAS
    const cleanCorruptedAuctions = () => {
      const corruptedAuctions = auctions.filter(auction => 
        !auction.title || auction.title === 'Sin título' || auction.title.trim() === ''
      );
      
      if (corruptedAuctions.length > 0) {
        console.log(`🗑️ Eliminando ${corruptedAuctions.length} subastas corruptas:`);
        corruptedAuctions.forEach(auction => {
          console.log(`   - "${auction.title}" (ID: ${auction.id})`);
        });
        
        // Filtrar solo subastas válidas
        const validAuctions = auctions.filter(auction => 
          auction.title && auction.title !== 'Sin título' && auction.title.trim() !== ''
        );
        
        setAuctions(validAuctions);
        return true; // Hubo limpieza
      }
      return false; // No hubo limpieza
    };

    const checkForOutbids = () => {
      if (!user) return;

      auctions.forEach(auction => {
        if (auction.status === 'active' && auction.bids.length > 0) {
          const key = `${auction.id}_${user.id}`;
          const userLastBidAmount = previousBidsRef.current.get(key);
          const currentWinningBid = auction.bids[auction.bids.length - 1];
          
          // Si el usuario tenía una oferta y ahora no es la ganadora
          if (userLastBidAmount && currentWinningBid.userId !== user.id) {
            // Verificar si superaron su oferta
            if (currentWinningBid.amount > userLastBidAmount) {
              console.log(`🚨 Usuario ${user.username} fue superado en subasta ${auction.title}`);
              
              // Notificar al usuario usando reglas
              triggerRuleBasedNotification(
                'auction_outbid',
                user.id,
                addNotification,
                {
                  amount: currentWinningBid.amount,
                  auctionTitle: auction.title,
                  auctionId: auction.id,
                  link: `/subastas/${auction.id}`
                }
              );

              // Reproducir sonido
              soundManager.playOutbid();
              
              // Actualizar el registro para no notificar múltiples veces
              previousBidsRef.current.delete(key);
            }
          }

          // Actualizar el registro de ofertas actuales del usuario
          const userCurrentBid = auction.bids
            .filter(bid => bid.userId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          
          if (userCurrentBid) {
            previousBidsRef.current.set(key, userCurrentBid.amount);
          }
        }
      });
    };

    const updateAuctionStatuses = async () => {
      const now = new Date();
      let needsUpdate = false;

      // Verificar que el usuario esté autenticado antes de procesar
      if (!user) {
        return; // Ya se verificó arriba, solo salir silenciosamente
      }

      // Verificar que auctions sea un array válido
      if (!Array.isArray(auctions) || auctions.length === 0) {
        return;
      }

      console.log('🕐 Chequeando subastas - Hora actual:', now.toISOString());

      const updatedAuctions = await Promise.all(auctions.map(async (auction) => {
        // Solo revisar subastas activas que aún no tienen ganador asignado
        if (auction.status === 'active' && !auction.winnerId) {
          // ✅ CRÍTICO: Verificar en Firebase el estado real antes de procesar
          // Esto asegura que todos los clientes vean el mismo estado
          try {
            if (!realtimeDb) {
              console.warn('⚠️ realtimeDb no está disponible');
              return auction;
            }
            const auctionRef = dbRef(realtimeDb, `auctions/${auction.id}`);
            const snapshot = await firebaseGet(auctionRef);
            
            if (snapshot.exists()) {
              const firebaseAuction = snapshot.val();
              // Si en Firebase ya está finalizada o tiene ganador, no procesar
              if (firebaseAuction.status === 'ended' || firebaseAuction.winnerId) {
                console.log(`⏭️ Subasta "${auction.title}" (ID: ${auction.id}) ya está finalizada en Firebase, omitiendo...`);
                // Actualizar el estado local para reflejar el estado de Firebase
                return {
                  ...auction,
                  status: firebaseAuction.status || auction.status,
                  winnerId: firebaseAuction.winnerId || auction.winnerId
                };
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error verificando estado en Firebase para subasta ${auction.id}:`, error);
            // Si hay error, continuar con la verificación local pero con precaución
          }
          
          // Verificar si ya procesamos esta subasta localmente (solo para evitar múltiples intentos en el mismo ciclo)
          if (processedEndedAuctionsRef.current.has(auction.id)) {
            console.log(`⏭️ Subasta "${auction.title}" (ID: ${auction.id}) ya fue procesada en este ciclo, omitiendo...`);
            return auction;
          }
          
          // Verificar si se está procesando actualmente (evitar procesamiento paralelo en el mismo cliente)
          if (processingAuctionsRef.current.has(auction.id)) {
            console.log(`⏳ Subasta "${auction.title}" (ID: ${auction.id}) ya se está procesando, omitiendo...`);
            return auction;
          }
          
          // Asegurarse de que endTime sea un objeto Date válido
          let endTime: Date;
          if (auction.endTime instanceof Date) {
            endTime = auction.endTime;
          } else if (typeof auction.endTime === 'string') {
            endTime = new Date(auction.endTime);
          } else {
            console.warn(`⚠️ Subasta "${auction.title}" tiene endTime inválido:`, auction.endTime);
            return auction; // No procesar si endTime es inválido
          }
          
          // Validar que la fecha sea válida
          if (isNaN(endTime.getTime())) {
            console.warn(`⚠️ Subasta "${auction.title}" tiene endTime inválido (NaN):`, auction.endTime);
            return auction; // No procesar si la fecha es inválida
          }
          
          // Usar timestamps para comparación más precisa
          const endTimeMs = endTime.getTime();
          const nowMs = now.getTime();
          const timeRemaining = endTimeMs - nowMs;
          
          console.log(`📊 Subasta "${auction.title}":`, {
            endTime: endTime.toISOString(),
            now: now.toISOString(),
            shouldEnd: endTimeMs <= nowMs,
            timeRemaining: timeRemaining,
            timeRemainingDays: (timeRemaining / (1000 * 60 * 60 * 24)).toFixed(2)
          });
          
          // Validación adicional: Si el tiempo restante es positivo (aún no finalizó), no procesar
          if (timeRemaining > 0) {
            // La subasta aún no ha finalizado, no procesar
            return auction;
          }
          
          // Si el tiempo de finalización ya pasó (con margen de 1 segundo para evitar problemas de precisión)
          if (endTimeMs <= nowMs + 1000) {
            // Verificar si ya procesamos esta subasta para evitar notificaciones duplicadas
            if (processedEndedAuctionsRef.current.has(auction.id)) {
              console.log(`⏭️ Subasta "${auction.title}" (ID: ${auction.id}) ya fue procesada anteriormente, omitiendo...`);
              return auction;
            }
            
            // Verificar si se está procesando actualmente (evitar procesamiento paralelo)
            if (processingAuctionsRef.current.has(auction.id)) {
              console.log(`⏳ Subasta "${auction.title}" (ID: ${auction.id}) ya se está procesando, omitiendo para evitar duplicados...`);
              return auction;
            }
            
            // Verificar que la subasta realmente esté activa antes de procesarla
            if (auction.status !== 'active') {
              console.log(`⚠️ Subasta "${auction.title}" (ID: ${auction.id}) tiene status "${auction.status}", no se procesará`);
              return auction;
            }
            
            // Verificar que no tenga ganador ya asignado
            if (auction.winnerId) {
              console.log(`⚠️ Subasta "${auction.title}" (ID: ${auction.id}) ya tiene ganador asignado: ${auction.winnerId}`);
              return auction;
            }
            
            // Validación crítica: Verificar que realmente haya pasado el tiempo
            // Si el tiempo restante es mayor a 1 minuto, algo está mal y no deberíamos procesar
            if (timeRemaining > 60000) {
              console.error(`❌ ERROR: Subasta "${auction.title}" (ID: ${auction.id}) tiene ${(timeRemaining / (1000 * 60 * 60 * 24)).toFixed(2)} días restantes pero se intentó finalizar. Omitiendo.`);
              return auction;
            }
            
            console.log(`🔄 Subasta "${auction.title}" (ID: ${auction.id}) finalizó automáticamente (endTime: ${endTime.toISOString()}, now: ${now.toISOString()}, diferencia: ${((nowMs - endTimeMs) / 1000).toFixed(0)} segundos)`);
            
            // Marcar como procesando ANTES de cualquier operación (solo para evitar múltiples intentos en el mismo cliente)
            processingAuctionsRef.current.add(auction.id);
            
            // Verificar si hay ganador (OFERTA MÁS ALTA)
            if (auction.bids.length > 0) {
              // Encontrar la oferta más alta
              const winningBid = auction.bids.reduce((highest, current) => 
                current.amount > highest.amount ? current : highest
              );
              const winnerId = winningBid.userId;
              const winnerName = winningBid.username;
              const finalPrice = winningBid.amount;
              const isBot = winnerId.startsWith('bot-');

              // ✅ CRÍTICO: Actualizar primero en Firebase para que todos los clientes vean el mismo estado
              try {
                await updateAuction(auction.id, {
                  status: 'ended',
                  winnerId: winnerId
                });
                console.log(`✅ Subasta "${auction.title}" actualizada en Firebase: status=ended, winnerId=${winnerId}`);
                
                // Solo después de actualizar en Firebase, crear notificaciones y orden
                // Esto asegura que todos los clientes vean el mismo estado
                
                // Si el ganador es un bot, no crear orden real (es ficticio)
                if (isBot) {
                  console.log(`🤖 Bot ${winnerName} ganó la subasta "${auction.title}" - No se creará orden real (ficticio)`);
                  return auction; // No crear orden para bots
                }
                
                // ✅ CRÍTICO: Verificar si ya existe una orden para esta subasta antes de crear una nueva
                // Esto previene duplicados cuando múltiples clientes procesan la misma subasta
                try {
                  const ordersRef = dbRef(realtimeDb, 'orders');
                  const ordersSnapshot = await firebaseGet(ordersRef);
                  const existingOrders = ordersSnapshot.val() || {};
                  
                  // Buscar si ya existe una orden para esta subasta (productId) y este ganador (userId)
                  const existingOrder = Object.values(existingOrders).find((o: any) => 
                    o.productId === auction.id && 
                    o.userId === winnerId && 
                    o.type === 'auction'
                  ) as any;
                  
                  if (existingOrder) {
                    console.log(`⏭️ Ya existe una orden para esta subasta (ID: ${auction.id}) y ganador (${winnerName}). Orden existente: ${existingOrder.id}`);
                    return auction; // No crear orden duplicada
                  }
                } catch (checkError) {
                  console.warn('⚠️ Error verificando órdenes existentes, continuando con creación:', checkError);
                  // Continuar con la creación si hay error en la verificación
                }
                
                // Crear orden de pago para el ganador (solo para usuarios reales)
                const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
                
                // Generar ID único basado en ULID y fecha
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const datePart = `${yyyy}${mm}${dd}`;
                const orderId = `ORD-${datePart}-${generateUlid()}`;
                
                const order: Order = {
                  id: orderId,
                  userId: winnerId,
                  userName: winnerName,
                  productId: auction.id,
                  productName: auction.title,
                  productImage: auction.images[0] || '',
                  productType: 'auction',
                  type: 'auction',
                  amount: finalPrice,
                  status: 'pending_payment',
                  deliveryMethod: 'shipping',
                  createdAt: now,
                  expiresAt: expiresAt,
                  address: { street: '', locality: '', province: '', location: { lat: 0, lng: 0 } }
                };

                // Crear orden
                addOrder(order).catch(err => {
                  console.error('❌ Error creando pedido automático:', err);
                });
                console.log(`📝 Orden creada para ${winnerName}: ${finalPrice} (Subasta ID: ${auction.id}, Orden ID: ${orderId})`);

                // Notificar al ganador usando reglas
                console.log(`🔔 Creando notificación de victoria para ${winnerName} en subasta "${auction.title}" (ID: ${auction.id})`);
                triggerRuleBasedNotification(
                  'auction_won',
                  winnerId,
                  addNotification,
                  {
                    auctionTitle: auction.title,
                    auctionId: auction.id,
                    amount: finalPrice,
                    link: '/notificaciones'
                  }
                );

                // Crear mensaje automático para el ganador
                createAutoMessage(
                  winnerId,
                  winnerName,
                  'auction_won',
                  {
                    auctionTitle: auction.title,
                    auctionId: auction.id,
                    amount: finalPrice,
                    orderId: order.id
                  }
                ).then(autoMsg => {
                  saveMessage(autoMsg).catch(err => {
                    console.error('❌ Error creando mensaje automático:', err);
                  });
                  console.log(`💬 Mensaje automático enviado a ${winnerName}`);
                }).catch(error => {
                  console.error('Error creando mensaje automático:', error);
                });

                // Reproducir sonido de victoria
                soundManager.playWon();
                // Efecto visual: papel picado para el usuario ganador (solo si no se celebró antes)
                if (user && user.id === winnerId) {
                  const winKey = `${auction.id}_${winnerId}`;
                  // Solo mostrar confeti si es una victoria nueva (no se celebró antes)
                  if (!celebratedWinsRef.current.has(winKey)) {
                    launchConfettiFromTop(3500);
                    celebratedWinsRef.current.add(winKey);
                    
                    // Guardar en Firebase para persistir entre sesiones
                    loadUserPreferences(user.id).then(preferences => {
                      const currentCelebratedWins = preferences.celebratedWins || [];
                      if (!currentCelebratedWins.includes(winKey)) {
                        const updatedCelebratedWins = [...currentCelebratedWins, winKey];
                        updateUserPreference(user.id, 'celebratedWins', updatedCelebratedWins).catch(error => {
                          console.error('❌ Error guardando celebración en Firebase:', error);
                        });
                      }
                    }).catch(error => {
                      console.error('❌ Error cargando preferencias para celebración:', error);
                    });
                  }
                }

                // Notificar al admin (se puede seguir usando un mensaje específico)
                triggerRuleBasedNotification(
                  'auction_won',
                  'admin',
                  addNotification,
                  {
                    auctionTitle: auction.title,
                    auctionId: auction.id,
                    amount: finalPrice
                  }
                );

                // Marcar como procesada solo después de éxito
                processedEndedAuctionsRef.current.add(auction.id);
                needsUpdate = true;
                
                return {
                  ...auction,
                  status: 'ended' as const,
                  winnerId: winnerId
                };
              } catch (error) {
                console.error(`❌ Error actualizando subasta ${auction.id} en Firebase:`, error);
                // Si falla la actualización en Firebase, no procesar
                processingAuctionsRef.current.delete(auction.id);
                return auction;
              }
            } else {
              // Si no hay ofertas, marcar como finalizada sin ganador
              try {
                await updateAuction(auction.id, {
                  status: 'ended'
                });
                console.log(`✅ Subasta "${auction.title}" actualizada en Firebase: status=ended (sin ganador)`);
                
                processedEndedAuctionsRef.current.add(auction.id);
                needsUpdate = true;
                
                return {
                  ...auction,
                  status: 'ended' as const
                };
              } catch (error) {
                console.error(`❌ Error actualizando subasta ${auction.id} en Firebase:`, error);
                processingAuctionsRef.current.delete(auction.id);
                return auction;
              }
            }
          } // Cierra if (endTimeMs <= nowMs + 1000)
        } // Cierra if (auction.status === 'active' && !auction.winnerId)
        return auction;
      }));

      // Solo actualizar si hubo cambios
      if (needsUpdate) {
        console.log('✅ Actualizando estado de subastas...');
        setAuctions(updatedAuctions);
        // El flag processingAuctionsRef se mantiene para prevenir procesamiento paralelo
        // Se limpiará automáticamente cuando la subasta se actualice en el estado y ya no pase la verificación de status === 'active'
      }
    };

    // ✅ PRIMERO: Limpiar subastas corruptas
    const hadCleanup = cleanCorruptedAuctions();
    
    // Si hubo limpieza, salir y esperar próximo ciclo
    if (hadCleanup) {
      console.log('🔄 Limpieza completada, esperando próximo ciclo...');
      return;
    }

    // Ejecutar chequeos normales
    checkForOutbids();
    updateAuctionStatuses().catch(err => console.error('Error en updateAuctionStatuses:', err));

    // Ejecutar cada 30 segundos para chequeos más frecuentes
    const interval = setInterval(() => {
      checkForOutbids();
      updateAuctionStatuses().catch(err => console.error('Error en updateAuctionStatuses:', err));
    }, 30000);

    return () => clearInterval(interval);
  }, [auctions, setAuctions, addNotification, addOrder, updateAuction, user]);

  return null;
};

export default AuctionManager;
