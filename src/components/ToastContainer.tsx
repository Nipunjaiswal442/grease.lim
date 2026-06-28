import type { Toast } from "../hooks/useToast";

interface Props {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type}`}
          onClick={() => removeToast(t.id)}
          style={{ cursor: "pointer" }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
