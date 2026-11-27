import { useNavigation, useRoute } from '@react-navigation/native';

export type Nav = {
  navigate: (name: string, params?: object) => void;
  push: (name: string, params?: object) => void;
  replace: (name: string, params?: object) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  popToTop: () => void;
  reset: (state: { index: number; routes: { name: string; params?: object }[] }) => void;
  setParams: (params: object) => void;
  addListener: (event: string, cb: () => void) => () => void;
};

export const useNav = () => useNavigation() as unknown as Nav;

export function useParams<T extends object>(): Partial<T> {
  const route = useRoute() as unknown as { params?: Partial<T> };
  return route.params ?? {};
}
