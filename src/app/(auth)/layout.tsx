export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-white">
          LC
        </span>
        <span className="text-xl font-semibold">Lender CRM</span>
      </div>
      {children}
    </div>
  );
}
