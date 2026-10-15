import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function GameModal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      className={`game-modal ${wide ? "wide" : ""}`}
      ref={ref}
      onCancel={onClose}
      aria-label={title}
    >
      <header>
        <div>
          <span className="game-kicker">
            ORIGIN FORGE / ARCHIVO DE BRITANNIA
          </span>
          <h2>{title}</h2>
        </div>
        <button
          className="game-close"
          onClick={onClose}
          type="button"
          aria-label="Cerrar"
        >
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
