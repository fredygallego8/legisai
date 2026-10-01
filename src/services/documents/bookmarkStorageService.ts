import { LegalBookmark } from '../../types';

const STORAGE_KEY = 'legisai_legal_bookmarks_vault';
const UPDATE_EVENT = 'legisai_bookmarks_updated';

export const INITIAL_BOOKMARKS: LegalBookmark[] = [
  {
    id: 'bm-1',
    title: 'Ratio Decidendi - Estabilidad Laboral Reforzada',
    content: 'El fuero de salud se activa de manera objetiva cuando el trabajador presenta una condición de salud que le impida o dificulte el desempeño de sus labores ordinarias, sin que se requiera necesariamente calificación de pérdida de capacidad laboral previa.',
    source: 'Sentencia SU-050/2022 - Corte Constitucional',
    expedienteId: 'exp-1',
    expedienteRadicado: '11001-31-05-015-2022-00342-01',
    createdAt: Date.now() - 86400000 * 3,
    tags: ['Laboral', 'Fuero de Salud', 'Estabilidad']
  },
  {
    id: 'bm-2',
    title: 'Prescripción de la Acción Penal en Delitos against the State',
    content: 'El término de prescripción de la acción penal se interrumpe con la formulación de imputación. A partir de dicho momento, el término máximo no podrá exceder de la mitad del tiempo fijado en el artículo 83 del Código Penal.',
    source: 'Casación Penal 54210 - Sala Penal CSJ',
    expedienteId: 'exp-2',
    expedienteRadicado: '11001-02-30-000-2023-00512-00',
    createdAt: Date.now() - 86400000 * 6,
    tags: ['Penal', 'Prescripción', 'Casación']
  },
  {
    id: 'bm-3',
    title: 'Protección al Debido Proceso en Trámite Hipotecario',
    content: 'En los procesos ejecutivos hipotecarios, el juez debe velar por la correcta notificación personal del mandamiento de pago, garantizando el derecho de defensa antes de ordenar el avalúo y remate del bien inmueble.',
    source: 'Proceso Ejecutivo Hipotecario - Juzgado 29 Civil',
    expedienteId: 'exp-1789743909641',
    expedienteRadicado: '05001-40-03-029-2024-01450-00',
    createdAt: Date.now() - 86400000 * 1,
    tags: ['Hipotecario', 'Debido Proceso', 'Civil']
  }
];

export const BookmarkStorageService = {
  getBookmarks: (): LegalBookmark[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKMARKS));
        return INITIAL_BOOKMARKS;
      }
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error cargando marcadores:', e);
      return INITIAL_BOOKMARKS;
    }
  },

  saveBookmark: (bookmark: Omit<LegalBookmark, 'id' | 'createdAt'>): LegalBookmark => {
    const bookmarks = BookmarkStorageService.getBookmarks();
    const newBookmark: LegalBookmark = {
      ...bookmark,
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now()
    };
    const updated = [newBookmark, ...bookmarks];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: updated }));
    return newBookmark;
  },

  removeBookmark: (id: string): LegalBookmark[] => {
    const bookmarks = BookmarkStorageService.getBookmarks();
    const updated = bookmarks.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: updated }));
    return updated;
  },

  subscribe: (callback: (bookmarks: LegalBookmark[]) => void) => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<LegalBookmark[]>;
      callback(customEvent.detail || BookmarkStorageService.getBookmarks());
    };
    window.addEventListener(UPDATE_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handler as EventListener);
    };
  }
};
