import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center"
    >
      <SEO
        title="Page not found"
        description="The page you're looking for doesn't exist on Kinsroot. Head back home to continue."
        noIndex
      />
      <img
        src="/logo.jpg"
        alt="Kinsroot logo"
        className="mb-6 h-20 w-20 rounded-full object-cover shadow-lg"
        loading="lazy"
      />
      <h1 className="mb-3 text-5xl font-bold text-primary">404</h1>
      <p className="mb-2 text-xl font-semibold text-foreground">
        We couldn't find that page
      </p>
      <p className="mb-8 max-w-md text-muted-foreground">
        The link may be broken, or the page may have been moved. Let's get you
        back to your family.
      </p>
      <Button asChild size="lg">
        <Link to="/">
          <Home className="mr-2 h-4 w-4" />
          Go home
        </Link>
      </Button>
    </main>
  );
};

export default NotFound;
