import { useEffect } from 'react';

/** Atualiza o título da aba (útil para acessibilidade e para quem compartilha o link). */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
