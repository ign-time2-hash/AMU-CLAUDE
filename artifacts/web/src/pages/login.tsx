import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../lib/auth.js';
import { LogoAmuLanding } from '../components/icons/logo-amu-landing.js';

const schema = z.object({
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
});
type FormData = z.infer<typeof schema>;

type LoginState = 'idle' | 'loading' | 'success' | 'error';

const TABS = [
  { label: 'PLANEJADOR', demo: 'planejador_adm' },
  { label: 'CLIENTE',    demo: 'cliente'        },
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const STORAGE_KEY = 'amu_remembered_username';

  const savedUsername = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) ?? '' : '';

  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [prevTab,   setPrevTab]   = useState<0 | 1>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(savedUsername !== '');
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const didPrefill = useRef(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: savedUsername },
  });

  // Preenche o campo na montagem se houver username salvo
  useEffect(() => {
    if (!didPrefill.current && savedUsername) {
      setValue('username', savedUsername);
      didPrefill.current = true;
    }
  }, [savedUsername, setValue]);

  function switchTab(idx: 0 | 1) {
    if (idx === activeTab) return;
    setPrevTab(activeTab);
    setActiveTab(idx);
    reset();
    setApiError(null);
    setLoginState('idle');
  }

  useEffect(() => {
    if (loginState === 'error') {
      setShake(true);
      const t = setTimeout(() => { setShake(false); setLoginState('idle'); }, 350);
      return () => clearTimeout(t);
    }
  }, [loginState]);

  const contentClass = activeTab > prevTab ? 'animate-content-right' : 'animate-content-left';

  const onSubmit = async (data: FormData) => {
    setLoginState('loading');
    setApiError(null);
    try {
      await login(data.username, data.password);
      if (remember) {
        localStorage.setItem(STORAGE_KEY, data.username);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      setLoginState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setApiError(msg);
      setLoginState('error');
    }
  };

  const fillDemo = (username: string) => {
    setValue('username', username);
    setValue('password', 'kronus2026');
    setApiError(null);
    setLoginState('idle');
  };

  const isLoading = loginState === 'loading';
  const isSuccess = loginState === 'success';

  return (
    <div
      className="min-h-screen flex font-sans"
      style={{ background: 'linear-gradient(135deg, #4E6B3D 0%, #6E8C57 45%, #A8BD92 100%)' }}
    >
      {/* ── Lado esquerdo — marca ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center px-16 select-none">
        <LogoAmuLanding className="w-full max-w-[680px]" />
        <p
          className="font-bold uppercase tracking-[0.25em] mt-4 text-center"
          style={{ fontSize: '15px', color: 'rgba(45, 65, 32, 0.75)' }}
        >
          Agenda de Manutenção Unificada
        </p>
      </div>

      {/* ── Lado direito — card ───────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div
          className={`w-full max-w-[400px] rounded-3xl p-8 ${shake ? 'animate-shake' : ''}`}
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255, 255, 255, 0.55)',
            boxShadow: '0 8px 40px rgba(20, 45, 15, 0.22)',
          }}
        >
          {/* ── Abas com pílula deslizante ───────────── */}
          <div
            className="relative flex rounded-xl p-1 mb-7"
            style={{ background: 'rgba(255,255,255,0.6)' }}
            role="tablist"
          >
            {/* Pílula */}
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg"
              style={{
                background: '#6AA151',
                transform: `translateX(${activeTab === 0 ? '0%' : 'calc(100% + 8px)'})`  ,
                transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                boxShadow: '0 2px 8px rgba(106,161,81,0.35)',
              }}
              aria-hidden
            />
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                role="tab"
                aria-selected={activeTab === i}
                onClick={() => switchTab(i as 0 | 1)}
                className="relative z-10 flex-1 py-2 text-[13px] font-bold uppercase tracking-widest rounded-lg transition-colors duration-200"
                style={{ color: activeTab === i ? '#FFFFFF' : '#40493C' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Conteúdo do formulário ───────────────── */}
          <form
            key={activeTab}
            className={contentClass}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="space-y-5">

              {/* Usuário */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#40493C]">
                  Usuário
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#828F7C] pointer-events-none" />
                  <input
                    {...register('username')}
                    type="text"
                    placeholder="seu usuário"
                    autoComplete="username"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#C2C9B9] bg-white/70 text-sm text-[#40493C] placeholder:text-[#828F7C] focus:outline-none focus:ring-2 focus:ring-[#6AA151]/40 focus:border-[#6AA151] transition-colors"
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-red-600">{errors.username.message}</p>
                )}
              </div>

              {/* Lembrar usuário */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-[#C2C9B9] accent-[#6AA151]"
                />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#40493C]">
                  Lembrar usuário
                </span>
              </label>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#40493C]">
                  Senha
                </label>
                <div className="relative">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#828F7C] hover:text-[#40493C] transition-colors"
                  >
                    {showPassword
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye    className="h-4 w-4" />}
                  </button>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="sua senha"
                    autoComplete="current-password"
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#C2C9B9] bg-white/70 text-sm text-[#40493C] placeholder:text-[#828F7C] focus:outline-none focus:ring-2 focus:ring-[#6AA151]/40 focus:border-[#6AA151] transition-colors"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Erro de API */}
              {apiError && (
                <p className="text-xs text-red-600 text-center">{apiError}</p>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className="group w-full h-11 rounded-lg font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all duration-180"
                style={{
                  background: '#6AA151',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.15) inset',
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && !isSuccess) {
                    (e.currentTarget as HTMLButtonElement).style.background = '#5C8F47';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(92,143,71,0.4), 0 1px 0 rgba(255,255,255,0.15) inset';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#6AA151';
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 0 rgba(255,255,255,0.15) inset';
                }}
                onMouseDown={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98) translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 0 rgba(255,255,255,0.15) inset';
                }}
                onMouseUp={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = '';
                }}
              >
                {isLoading ? (
                  <span
                    className="animate-spin-slow h-[18px] w-[18px] rounded-full border-2 border-white/40 border-t-white"
                  />
                ) : isSuccess ? (
                  <Check className="h-5 w-5" style={{ animation: 'scale-pop 250ms ease-out' }} />
                ) : (
                  <>
                    Entrar
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-180 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              {/* Demo rápido */}
              <div className="flex justify-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => { switchTab(0); fillDemo(TABS[0].demo); }}
                  className="text-[11px] text-[#828F7C] hover:text-[#40493C] underline underline-offset-2 transition-colors"
                >
                  Demo Planejador
                </button>
                <button
                  type="button"
                  onClick={() => { switchTab(1); fillDemo(TABS[1].demo); }}
                  className="text-[11px] text-[#828F7C] hover:text-[#40493C] underline underline-offset-2 transition-colors"
                >
                  Demo Cliente
                </button>
              </div>
            </div>
          </form>

          {/* Rodapé */}
          <p className="mt-6 text-right text-[11px] text-[#828F7C]">
            © 2026 AMU Sistemas
          </p>
        </div>
      </div>
    </div>
  );
}
