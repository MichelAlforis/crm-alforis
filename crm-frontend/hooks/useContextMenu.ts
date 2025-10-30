/**
 * Hook React pour context menu (clic droit) VISTA STYLE 💎
 *
 * Gère l'affichage d'un menu contextuel avec animations glassmorphism.
 */

import { useState, useEffect, useCallback, RefObject } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseContextMenuReturn {
  /** Position du menu (null = caché) */
  position: Position | null;
  /** Afficher le menu à une position */
  showMenu: (x: number, y: number) => void;
  /** Cacher le menu */
  hideMenu: () => void;
  /** Handler pour clic droit */
  onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * Hook pour gérer un context menu Vista-style.
 *
 * @example
 * ```tsx
 * const { position, hideMenu, onContextMenu } = useContextMenu();
 *
 * return (
 *   <>
 *     <input onContextMenu={onContextMenu} />
 *     {position && (
 *       <ContextMenu position={position} onClose={hideMenu} />
 *     )}
 *   </>
 * );
 * ```
 */
export function useContextMenu(): UseContextMenuReturn {
  const [position, setPosition] = useState<Position | null>(null);

  const showMenu = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const hideMenu = useCallback(() => {
    setPosition(null);
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Position du menu = position du clic
    showMenu(e.clientX, e.clientY);
  }, [showMenu]);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!position) return;

    const handleClick = () => hideMenu();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideMenu();
    };

    // Petit délai pour éviter de fermer immédiatement
    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 100);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, hideMenu]);

  return {
    position,
    showMenu,
    hideMenu,
    onContextMenu,
  };
}

/**
 * Hook pour context menu attaché à un élément spécifique.
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * const { position, hideMenu } = useContextMenuOnElement(inputRef);
 *
 * return (
 *   <>
 *     <input ref={inputRef} />
 *     {position && <ContextMenu position={position} onClose={hideMenu} />}
 *   </>
 * );
 * ```
 */
export function useContextMenuOnElement<T extends HTMLElement>(
  ref: RefObject<T>
): UseContextMenuReturn {
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPosition({ x: e.clientX, y: e.clientY });
    };

    element.addEventListener('contextmenu', handleContextMenu);

    return () => {
      element.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [ref]);

  const hideMenu = useCallback(() => {
    setPosition(null);
  }, []);

  const showMenu = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    showMenu(e.clientX, e.clientY);
  }, [showMenu]);

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!position) return;

    const handleClick = () => hideMenu();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideMenu();
    };

    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('contextmenu', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 100);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, hideMenu]);

  return {
    position,
    showMenu,
    hideMenu,
    onContextMenu,
  };
}
