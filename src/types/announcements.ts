// Tipos para el sistema de anuncios

export type AnnouncementType = 'text' | 'image' | 'urgent' | 'promotional';
export type AnnouncementStatus = 'active' | 'expired' | 'draft';
export type AnnouncementPriority = 'low' | 'medium' | 'high';
export type TargetUsers = 'all_users' | 'new_users' | 'premium_users' | 'custom_segment' | string[]; // string[] para custom segment
export type SchedulingType = 'immediate' | 'scheduled_date' | 'recurring';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  imageUrl?: string;
  linkUrl?: string;
  targetUsers: TargetUsers;
  createdAt: Date;
  expiresAt?: Date;
  scheduledAt?: Date;
  createdBy: string; // admin UID
  status: AnnouncementStatus;
  priority: AnnouncementPriority;
  scheduling?: SchedulingType;
}

export interface UserAnnouncement {
  announcementId: string;
  read: boolean;
  dismissed: boolean;
  receivedAt: Date;
  interactedAt?: Date;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  type: AnnouncementType;
  imageUrl?: string;
  linkUrl?: string;
  targetUsers: TargetUsers | 'custom_segment'; // Permite 'custom_segment' en el formulario
  expiresAt?: string; // ISO string
  scheduledAt?: string; // ISO string
  priority: AnnouncementPriority;
  scheduling: SchedulingType;
}

