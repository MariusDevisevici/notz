import Link from "next/link";
import { auth } from "@/auth";
import { loginAction, logoutAction } from "@/app/actions/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StarIcon } from "@phosphor-icons/react/dist/ssr";

const Header = async () => {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const identity = session?.user?.name ?? session?.user?.email ?? "Guest";
  const image = session?.user?.image;
  const userInitial = identity.trim().charAt(0).toUpperCase();
  const userEmail = session?.user?.email;

  const allNotz = isLoggedIn && userEmail
    ? await prisma.notz.findMany({
        where: {
          user: {
            email: userEmail,
          },
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          featured: true,
        },
      })
    : [];

  const featuredNotz = allNotz.filter((n) => n.featured);

  return (
    <header className="px-2 py-3 sm:px-6 sm:py-5">
      <div className="neo-panel mx-auto flex w-full max-w-6xl items-center justify-between gap-2 bg-card px-2.5 py-2.5 sm:gap-4 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 -rotate-2 border-3 border-foreground bg-primary px-2.5 py-1.5 text-base font-black uppercase tracking-[0.18em] text-primary-foreground shadow-[4px_4px_0_0_var(--color-foreground)] sm:border-4 sm:px-3 sm:py-2 sm:text-lg sm:tracking-[0.2em] sm:shadow-[6px_6px_0_0_var(--color-foreground)]"
          >
            Notz
          </Link>

          {isLoggedIn && featuredNotz.length > 0 && (
            <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto sm:gap-2">
              {featuredNotz.map((item, index) => {
                const starColors = [
                  "text-primary",
                  "text-amber-500",
                  "text-emerald-500",
                ];
                const starColor = starColors[index % starColors.length];

                return (
                  <Link
                    key={item.id}
                    href={`/notz/${encodeURIComponent(item.name)}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xs" }),
                      "shrink-0"
                    )}
                    aria-label={item.name}
                  >
                    <StarIcon weight="fill" className={cn("size-3.5 sm:hidden", starColor)} />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <>
              <Link
                href="/create-notz"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "xs" }),
                  "hidden shrink-0 sm:inline-flex"
                )}
              >
                Manage Notz
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex shrink-0 cursor-pointer items-center gap-2 rounded-none border-3 border-foreground bg-secondary px-2 py-1.5 shadow-[4px_4px_0_0_var(--color-foreground)] outline-none transition-transform focus-visible:ring-0 data-popup-open:translate-x-0.5 data-popup-open:translate-y-0.5 data-popup-open:shadow-[2px_2px_0_0_var(--color-foreground)] sm:gap-3 sm:px-3 sm:py-2 sm:shadow-[6px_6px_0_0_var(--color-foreground)] sm:data-popup-open:shadow-[4px_4px_0_0_var(--color-foreground)]"
                  aria-label="Open account menu"
                >
                  <Avatar
                    size="default"
                    className="size-8 border-2 border-foreground bg-accent after:hidden sm:size-11 sm:border-3"
                  >
                    <AvatarImage src={image ?? undefined} alt={identity} />
                    <AvatarFallback className="bg-accent text-xs font-black uppercase text-foreground sm:text-sm">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex flex-col gap-0.5 sm:gap-1" aria-hidden="true">
                    <span className="block h-0.5 w-4 bg-foreground sm:w-5" />
                    <span className="block h-0.5 w-4 bg-foreground sm:w-5" />
                    <span className="block h-0.5 w-4 bg-foreground sm:w-5" />
                  </span>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="neo-panel min-w-48 max-w-[calc(100vw-2rem)] rounded-none border-3 border-foreground bg-card p-3 shadow-[4px_4px_0_0_var(--color-foreground)] ring-0 sm:min-w-56 sm:shadow-[6px_6px_0_0_var(--color-foreground)]"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="border-b-3 border-foreground px-0 pb-2 text-xs font-black uppercase tracking-[0.18em] text-foreground/70">
                      {identity}
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <div className="mt-3 grid gap-2">
                    <DropdownMenuItem className="border-3 border-foreground bg-accent px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-foreground shadow-[4px_4px_0_0_var(--color-foreground)] focus:bg-accent focus:text-foreground">
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem className="border-3 border-foreground bg-secondary px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-foreground shadow-[4px_4px_0_0_var(--color-foreground)] focus:bg-secondary focus:text-foreground sm:hidden">
                      <Link
                        href="/create-notz"
                        className="flex w-full text-foreground"
                      >
                        Manage Notz
                      </Link>
                    </DropdownMenuItem>

                    {allNotz.length > 0 && (
                      <>
                        <DropdownMenuSeparator className="mx-0 my-1 h-0.75 bg-foreground" />
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="px-0 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/50">
                            Your Notz
                          </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <div className="grid gap-1">
                          {allNotz.map((item) => (
                            <DropdownMenuItem key={item.id}>
                              <Link
                                href={`/notz/${encodeURIComponent(item.name)}`}
                                className="flex w-full items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground"
                              >
                                {item.featured && (
                                  <span className="inline-block size-1.5 shrink-0 bg-primary" aria-label="Featured" />
                                )}
                                {item.name}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </div>
                      </>
                    )}

                    <DropdownMenuSeparator className="mx-0 my-1 h-0.75 bg-foreground" />
                    <form action={logoutAction}>
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full justify-start border-3 px-4 py-3 text-left text-xs tracking-[0.16em]"
                      >
                        Sign out
                      </Button>
                    </form>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <form action={loginAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="cursor-pointer"
              >
                Sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
