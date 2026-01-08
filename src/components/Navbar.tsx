"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { User, LogOut, Menu, X, Moon, Sun, MessageSquare, Search } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import Avatar from "./Avatar";
import { useTheme } from "./ThemeProvider";

export function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [showToast, setShowToast] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();

    // Hide navbar on auth pages
    if (pathname?.startsWith("/auth")) return null;

    const navItems = [
        { name: "Announcements", href: "/announcements" },
        { name: "Surplus Store", href: "/store" },
        { name: "Events", href: "/events" },
        { name: "Hoodmaps", href: "/hoodmaps" },
        { name: "Community", href: "/community" },
        { name: "Friends", href: "/friends" },
        { name: "Messages", href: "/messages" },
    ];

    const handleNavClick = (e: React.MouseEvent, href: string) => {
        if (!session && href !== '/') {
            e.preventDefault();
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } else {
            setIsOpen(false);
        }
    };

    return (
        <>
            <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/60 backdrop-blur-xl">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Campus Connect
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={(e) => handleNavClick(e, item.href)}
                                className={clsx(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    pathname === item.href ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Auth Buttons / Profile */}
                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                        >
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        {session ? (
                            <div className="flex items-center gap-4">
                                {session.user?.role === 'superadmin' && (
                                    <Link
                                        href="/superadmin"
                                        className="px-3 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/30 transition-colors"
                                    >
                                        ADMIN
                                    </Link>
                                )}
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                                >
                                    <Avatar
                                        avatarId={session.user?.avatar}
                                        name={session.user?.name || undefined}
                                        imageUrl={session.user?.image}
                                        size="sm"
                                    />
                                    <span>{session.user?.name}</span>
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors text-muted-foreground"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link
                                    href="/auth/signin"
                                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-muted-foreground"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden absolute top-16 left-0 w-full bg-background/95 backdrop-blur-xl border-b border-border p-4 flex flex-col gap-4 animate-in slide-in-from-top-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={(e) => handleNavClick(e, item.href)}
                                className="text-base font-medium py-2 text-muted-foreground hover:text-primary"
                            >
                                {item.name}
                            </Link>
                        ))}
                        <hr className="border-border" />
                        <button
                            onClick={() => {
                                toggleTheme();
                                setIsOpen(false);
                            }}
                            className="flex items-center gap-2 py-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                            {theme === "dark" ? "Light Mode" : "Dark Mode"}
                        </button>
                        <hr className="border-border" />
                        {session ? (
                            <>
                                <Link
                                    href="/profile"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-2 py-2 text-muted-foreground"
                                >
                                    <Avatar
                                        avatarId={session.user?.avatar}
                                        name={session.user?.name || undefined}
                                        imageUrl={session.user?.image}
                                        size="sm"
                                    />
                                    Profile
                                </Link>
                                <button
                                    onClick={() => {
                                        signOut({ callbackUrl: '/' });
                                        setIsOpen(false);
                                    }}
                                    className="flex items-center gap-2 py-2 text-red-400"
                                >
                                    <LogOut size={18} />
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col gap-3 mt-2">
                                <Link
                                    href="/auth/signin"
                                    className="w-full py-2 text-center rounded-lg border border-border text-muted-foreground hover:bg-secondary/5"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/signup"
                                    className="w-full py-2 text-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Custom Toast Notification */}
            {showToast && (
                <div className="fixed top-20 right-4 z-[60] bg-background border border-border px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right-10 fade-in duration-300 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <User size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">Authentication Required</h4>
                        <p className="text-xs text-muted-foreground">Please sign in to access this feature.</p>
                    </div>
                </div>
            )}
        </>
    );
}
