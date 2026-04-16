import { auth } from "@/auth";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();
  const username = session?.user?.name ?? session?.user?.email ?? "friend";
  const isLoggedIn = Boolean(session?.user);
  const containerClassName = isLoggedIn
    ? "mx-auto flex min-h-[calc(100vh-106px)] w-full max-w-6xl items-center justify-center"
    : "mx-auto grid min-h-[calc(100vh-106px)] w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center";

  return (
    <section className="relative overflow-hidden px-2 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-6 top-10 h-20 w-20 rotate-12 border-3 border-foreground bg-accent shadow-[4px_4px_0_0_var(--color-foreground)] animate-[neo-bob_5s_ease-in-out_infinite] sm:left-10 sm:h-36 sm:w-36 sm:border-4 sm:shadow-[8px_8px_0_0_var(--color-foreground)]" />
      <div className="pointer-events-none absolute -right-4 bottom-12 h-16 w-16 -rotate-12 rounded-full border-3 border-foreground bg-secondary shadow-[4px_4px_0_0_var(--color-foreground)] animate-[neo-bob_4s_ease-in-out_infinite_0.6s] sm:right-12 sm:h-28 sm:w-28 sm:border-4 sm:shadow-[8px_8px_0_0_var(--color-foreground)]" />

      <div className={containerClassName}>
        <div className="relative w-full animate-[neo-enter_700ms_cubic-bezier(0.22,1,0.36,1)_both] lg:max-w-4xl">
          {!isLoggedIn && (
            <div className="neo-label mb-5 w-fit -rotate-2 bg-primary text-primary-foreground">
              Loud notes. Real life.
            </div>
          )}

          <div className="neo-panel-lg relative overflow-hidden px-3 py-5 sm:px-8 sm:py-10">
            <div className="neo-dot-grid absolute inset-0 opacity-35" />
            <div className="relative space-y-5 sm:space-y-6">
              {!isLoggedIn && (
                <p className="max-w-xl text-xs font-black uppercase tracking-[0.14em] text-muted-foreground sm:text-sm sm:tracking-[0.24em]">
                  Built for recipes, watchlists, game logs, and everything between.
                </p>
              )}

              {isLoggedIn ? (
                <>
                  <h1 className="max-w-3xl text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-6xl sm:tracking-[-0.06em] lg:text-7xl">
                    Welcome back,
                    <span className="mt-2 block -rotate-1 truncate bg-accent px-2 py-1.5 text-foreground sm:mt-3 sm:px-3 sm:py-2">
                      {username}
                    </span>
                  </h1>
                  <Link
                    href="/create-notz"
                    className={`${buttonVariants({ variant: "default", size: "lg" })} w-full justify-center sm:w-auto`}
                  >
                    Create Notz
                  </Link>
                </>
              ) : (
                <h1 className="max-w-4xl text-3xl font-black uppercase leading-none tracking-[-0.04em] sm:text-6xl sm:tracking-[-0.06em] lg:text-7xl">
                  Keep every part
                  <span className="mt-2 block rotate-1 bg-primary px-2 py-1.5 text-primary-foreground sm:mt-3 sm:px-3 sm:py-2">
                    of your life in notes.
                  </span>
                </h1>
              )}

              {!isLoggedIn && (
                <>
                  <p className="max-w-2xl text-base leading-7 text-foreground/80 sm:text-lg">
                    Save recipes you want to retry, movies you finished, games you played, and any personal note worth keeping. Notz gives every category the same clear, bold place to live.
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.12em] sm:gap-3 sm:text-sm sm:tracking-[0.18em]">
                    <span className="neo-panel rotate-0 bg-secondary px-3 py-1.5 sm:-rotate-2 sm:px-4 sm:py-2">Any note type</span>
                    <span className="neo-panel rotate-0 bg-accent px-3 py-1.5 sm:rotate-[1.5deg] sm:px-4 sm:py-2">Recipes and movies</span>
                    <span className="neo-panel rotate-0 bg-primary px-3 py-1.5 text-primary-foreground sm:-rotate-1 sm:px-4 sm:py-2">Games and more</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {!isLoggedIn && (
          <aside className="grid gap-4 animate-[neo-enter_850ms_cubic-bezier(0.22,1,0.36,1)_both] sm:gap-5 lg:justify-self-end">
            <div className="neo-panel max-w-md rotate-0 bg-secondary p-4 sm:rotate-[1.5deg] sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                What to keep
              </p>
              <ul className="mt-3 space-y-2 text-xs font-bold uppercase tracking-widest sm:space-y-3 sm:text-sm sm:tracking-[0.12em]">
                <li className="border-l-3 border-foreground pl-2.5 sm:border-l-4 sm:pl-3">Recipes with ingredients and tweaks</li>
                <li className="border-l-3 border-foreground pl-2.5 sm:border-l-4 sm:pl-3">Movies you watched and want to revisit</li>
                <li className="border-l-3 border-foreground pl-2.5 sm:border-l-4 sm:pl-3">Games, sessions, rankings, and backlog notes</li>
              </ul>
            </div>

            <div className="neo-panel max-w-md rotate-0 bg-card p-4 sm:rotate-[-1.5deg] sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                Why Notz
              </p>
              <p className="mt-3 text-base font-bold leading-7">
                One place for the things you cook, watch, play, and remember, without forcing them into a single boring template.
              </p>
            </div>

            <div className="neo-panel max-w-md rotate-0 bg-accent p-4 sm:rotate-1 sm:p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground/70">
                Start simple
              </p>
              <p className="mt-3 text-base font-bold leading-7">
                Sign in when you are ready to start building your own collection of notes.
              </p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
