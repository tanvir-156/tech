import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#FF6B00',
  primaryDark: '#E85D00',
  primaryLight: '#FF8A33',
  primarySoft: '#FFF1E6',
  primarySofter: '#FFF8F2',
  dark: '#14100D',
  dark2: '#1F1814',
  dark3: '#2A201A',
  bg: '#F6F6FA',
  card: '#FFFFFF',
  text: '#16151A',
  text2: '#4B4B57',
  muted: '#8A8A98',
  border: '#ECECF2',
  borderStrong: '#DCDCE6',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  danger: '#E11D48',
  dangerSoft: '#FFE4E9',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15,12,10,0.55)',
};

export const gradients = {
  primary: ['#FF8A1F', '#FF5E00'] as [string, string],
  dark: ['#241A14', '#14100D'] as [string, string],
  hero: ['#2A1A0F', '#4A2208', '#FF6B00'] as [string, string, string],
  soft: ['#FFF4EA', '#FFFFFF'] as [string, string],
};

export const font = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  bold: 'Poppins-Bold',
};

export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const shadow = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1B1020',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    default: { elevation: 2 },
  }) as ViewStyle,
  md: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1B1020',
      shadowOpacity: 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 5 },
  }) as ViewStyle,
  glow: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#FF6B00',
      shadowOpacity: 0.35,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
    default: { elevation: 8 },
  }) as ViewStyle,
};

export type StatusTone = { bg: string; fg: string; label: string };

export const statusTone = (status: string): StatusTone => {
  switch ((status || '').toLowerCase()) {
    case 'pending':
    case 'processing':
    case 'requested':
    case 'review':
      return { bg: '#FFE9D6', fg: '#F26B00', label: status === 'pending' ? 'Pending' : cap(status) };
    case 'confirmed':
    case 'approved':
    case 'paid':
    case 'active':
    case 'success':
      return { bg: '#DCFCE7', fg: '#15803D', label: cap(status) };
    case 'shipped':
    case 'processing_refund':
      return { bg: '#DBEAFE', fg: '#1D4ED8', label: cap(status) };
    case 'delivered':
    case 'refunded':
    case 'completed':
      return { bg: '#DCFCE7', fg: '#15803D', label: cap(status) };
    case 'cancelled':
    case 'canceled':
    case 'failed':
    case 'rejected':
    case 'inactive':
      return { bg: '#FFE4E9', fg: '#BE123C', label: cap(status) };
    default:
      return { bg: '#EEF0F5', fg: '#4B5563', label: cap(status || 'Unknown') };
  }
};

function cap(s: string) {
  const t = (s || '').replace(/_/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
