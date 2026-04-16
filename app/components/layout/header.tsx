import Link from "next/link";
import { auth } from "@/auth";
import { loginAction, logoutAction } from "@/app/actions/auth-actions";

const Header = async () => {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <header className="border-b border-black/10 px-6 py-4">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Notz
        </Link>

        {isLoggedIn ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 cursor-pointer"
            >
              Logout
            </button>
          </form>
        ) : (
          <form action={loginAction}>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 cursor-pointer"
            >
              Sign in
            </button>
          </form>
        )}
      </div>
    </header>
  );
};

export default Header;
