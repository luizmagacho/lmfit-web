import { toast } from "react-hot-toast";

export function showConfirmToast({
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
}: {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}) {
  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-white dark:bg-neutral-800 shadow-lg rounded-lg pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-full p-4">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {message}
          </p>
        </div>
        <div className="flex border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => {
              toast.dismiss(t.id);
            }}
            className="w-full border-r border-neutral-200 dark:border-neutral-700 rounded-none rounded-bl-lg px-4 py-3 flex items-center justify-center text-sm font-medium text-neutral-600 hover:text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            className="w-full rounded-none rounded-br-lg px-4 py-3 flex items-center justify-center text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {confirmText}
          </button>
        </div>
      </div>
    ),
    {
      duration: Infinity,
    }
  );
}
