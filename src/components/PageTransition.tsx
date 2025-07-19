import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();

  return (
    <div className="min-h-screen animate-fade-in">
      {children}
    </div>
  );
};

export default PageTransition;