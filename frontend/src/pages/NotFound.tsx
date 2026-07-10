import { motion } from "framer-motion";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Keeping your original logging for debugging purposes
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass rounded-3xl p-6 sm:p-10 md:p-16 max-w-lg w-full text-center relative z-10 border-border/50 shadow-2xl"
      >
        {/* Floating Icon */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: [-8, 8, -8] }}
          transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          className="w-24 h-24 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner"
        >
          <MapPinOff className="w-10 h-10 text-primary opacity-90" />
        </motion.div>

        {/* Text Content */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-gradient mb-4 tracking-tighter">404</h1>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3">Lost in the Void</h2>
        
        <p className="text-muted-foreground mb-8 leading-relaxed">
          We couldn't find the page you're looking for. The route{" "}
          <code className="bg-background/60 px-2 py-1 rounded-md text-primary text-xs font-mono border border-border/30 mx-1">
            {location.pathname}
          </code>{" "}
          might be broken, removed, or temporarily unavailable.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto bg-background/50 hover:bg-background/80 backdrop-blur-sm border-border/50 transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
          
          <Button
            asChild
            variant="hero"
            className="w-full sm:w-auto glow-primary transition-all hover:scale-105 active:scale-95"
          >
            <Link to="/">
              <Home className="w-4 h-4 mr-2" /> Return Home
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;