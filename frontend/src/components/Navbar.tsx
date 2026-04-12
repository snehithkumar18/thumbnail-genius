import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Menu, X } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  onOpenAuth: (tab?: "login" | "signup") => void;
}

const Navbar = ({ onOpenAuth }: NavbarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const onAuthClick = () => onOpenAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[56px] tab:h-[64px] border-b border-border bg-white/80 backdrop-blur-md safe-top">
      <div className="container h-full flex items-center justify-between px-4 tab:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-heading font-bold text-xl text-foreground tracking-tight">ThumbAI</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden tab:flex items-center gap-8">
          {["Features", "Templates", "Pricing", "Enterprise"].map((item) => (
            <Link
              key={item}
              to={`/#${item.toLowerCase()}`}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <Button size="sm" variant="hero" className="hidden sm:flex" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onAuthClick}>Sign In</Button>
              <Button size="sm" variant="hero" onClick={onAuthClick}>App Preview</Button>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="tab:hidden h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="fixed inset-0 z-50 w-full h-full bg-white p-0 border-none sm:rounded-none m-0 shadow-none">
              <DialogHeader className="sr-only">
                 <DialogTitle>Mobile navigation</DialogTitle>
                 <DialogDescription>Primary navigation links and actions.</DialogDescription>
              </DialogHeader>
                <div className="flex flex-col h-full safe-top">
                   <div className="flex items-center justify-between px-6 py-4 border-b">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                         </div>
                         <span className="font-heading font-bold text-lg">ThumbAI</span>
                      </div>
                      <DialogClose asChild>
                         <Button variant="ghost" size="icon" className="h-10 w-10">
                            <X className="h-6 w-6" />
                         </Button>
                      </DialogClose>
                   </div>
                   <div className="flex-1 flex flex-col p-6 gap-2">
                        {["Features", "Templates", "Pricing", "Enterprise"].map((item) => (
                        <DialogClose asChild key={item}>
                           <Link
                              to={`/#${item.toLowerCase()}`}
                              className="text-2xl font-semibold py-4 border-b border-border/50 text-foreground"
                           >
                              {item}
                           </Link>
                        </DialogClose>
                        ))}
                   </div>
                   <div className="p-6 border-t border-border mt-auto mb-8 space-y-3">
                      {user ? (
                         <Button size="xl" variant="hero" className="w-full" asChild>
                            <Link to="/dashboard">Go to Dashboard</Link>
                         </Button>
                      ) : (
                         <>
                            <Button size="xl" variant="outline" className="w-full" onClick={onAuthClick}>Sign In</Button>
                            <Button size="xl" variant="hero" className="w-full" onClick={onAuthClick}>Start Free Trial</Button>
                         </>
                      )}
                   </div>
                </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
