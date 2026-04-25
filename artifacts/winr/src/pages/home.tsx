import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Banknote, Users, CheckCircle2 } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <nav className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${basePath}/logo.svg`} alt="WINR Logo" className="h-8 w-8" />
            <span className="font-bold text-2xl tracking-tight text-primary">WINR</span>
          </div>
          <div className="flex gap-4">
            <Link href="/sign-in">
              <a className="text-foreground hover:text-primary transition-colors font-medium px-4 py-2">Sign In</a>
            </Link>
            <Link href="/sign-up">
              <a className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold px-5 py-2 rounded-lg shadow-sm">Get Started</a>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8 border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            The smart way to earn online
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-balance">
            Turn your network into <span className="text-primary">Net Worth.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            WINR is the no-nonsense Nigerian earning platform. Activate your account once, complete tasks, refer friends, and withdraw your earnings weekly. Real money for real hustlers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sign-up">
              <a className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold px-8 py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 hover:scale-105">
                Start Earning Now <ArrowRight className="h-5 w-5" />
              </a>
            </Link>
            <p className="text-sm text-muted-foreground sm:hidden mt-2">Just ₦1,000 to activate</p>
          </div>
          <div className="mt-8 text-sm text-muted-foreground hidden sm:flex items-center justify-center gap-6">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> One-time ₦1,000 fee</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> ₦500 per referral</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Weekly withdrawals</div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 bg-card border-y border-border px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How WINR Works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Three simple steps to start building your balance.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors shadow-sm">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">1. Activate Account</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sign up and pay a one-time activation fee of ₦1,000 via secure bank transfer to unlock your dashboard.
                </p>
              </div>

              <div className="bg-background p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors shadow-sm">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">2. Earn & Refer</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get credited for completing platform tasks and earn an instant ₦500 bonus for every active user you refer.
                </p>
              </div>

              <div className="bg-background p-8 rounded-2xl border border-border hover:border-primary/50 transition-colors shadow-sm">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <Banknote className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">3. Withdraw Weekly</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Request a withdrawal straight to your Nigerian bank account once a week. Fast, reliable payouts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to secure the bag?</h2>
          <p className="text-xl text-muted-foreground mb-10">Join thousands of Nigerians earning on WINR today.</p>
          <Link href="/sign-up">
            <a className="inline-flex bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold px-10 py-4 rounded-xl shadow-lg transition-all items-center gap-2 hover:scale-105">
              Create Free Account
            </a>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-12 px-4 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={`${basePath}/logo.svg`} alt="WINR Logo" className="h-6 w-6 opacity-50 grayscale" />
          <span className="font-bold text-xl tracking-tight text-foreground/50">WINR</span>
        </div>
        <p className="mb-6">© {new Date().getFullYear()} WINR Platform. All rights reserved.</p>
        <div className="max-w-3xl mx-auto border-t border-amber-500/20 pt-6 mt-2">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-amber-500">Risk Warning:</span> Trading involves significant risk. Losses can exceed expectations and past performance does not guarantee future results. Only trade with money you can afford to lose.
          </p>
        </div>
      </footer>
    </div>
  );
}
