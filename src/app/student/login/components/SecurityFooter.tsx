//src\app\student\login\components\SecurityFooter.tsx
export function SecurityFooter({ message }: { message: string }) {
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 md:mt-12 pt-6 border-t border-slate-900 text-center">
      <p className="text-[10px] md:text-[11px] leading-relaxed font-medium text-slate-500 max-w-2xl mx-auto">
        🔒 {message}
      </p>
    </div>
  );
}