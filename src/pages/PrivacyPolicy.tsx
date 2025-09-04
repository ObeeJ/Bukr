// src/pages/PrivacyPolicy.tsx

import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 responsive-spacing">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover-glow"
            onClick={handleGoBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <AnimatedLogo size="md" />
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-[var(--radius)]">
          <h1 className="text-3xl sm:text-4xl font-bold watermark text-glow mb-8">Privacy Policy</h1>

          <div className="space-y-8 text-foreground font-montserrat">
            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">1. Introduction</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Welcome to Bukr. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy explains how we handle your personal data when you visit our website, 
                your privacy rights, and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">2. Data We Collect</h2>
              <p className="text-muted-foreground mb-3 text-sm sm:text-base">
                We collect, use, store, and transfer various types of personal data, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>Identity Data: name, username, or similar identifier</li>
                <li>Contact Data: email address, phone number</li>
                <li>Technical Data: IP address, login data, browser type</li>
                <li>Profile Data: preferences, feedback, survey responses</li>
                <li>Usage Data: information about how you use our website and services</li>
                <li>Marketing Data: your marketing preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">3. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-3 text-sm sm:text-base">
                We use your personal data only when permitted by law, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>Registering you as a new customer</li>
                <li>Processing and delivering orders</li>
                <li>Managing our relationship with you</li>
                <li>Improving our website, products, services, and marketing</li>
                <li>Recommending relevant products or services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">4. Data Security</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                We implement robust security measures to prevent unauthorized access, loss, alteration, or disclosure 
                of your personal data. Access is restricted to employees, agents, and contractors with a legitimate 
                business need.
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">5. Your Legal Rights</h2>
              <p className="text-muted-foreground mb-3 text-sm sm:text-base">
                You have rights under data protection laws, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground text-sm sm:text-base">
                <li>Access to your personal data</li>
                <li>Correction of your personal data</li>
                <li>Erasure of your personal data</li>
                <li>Objection to processing</li>
                <li>Restriction of processing</li>
                <li>Data transfer</li>
                <li>Withdrawal of consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">6. Contact Us</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                For questions about this privacy policy or our practices, contact us at:
                <br />
                <a
                  href="mailto:privacy@bukr.app"
                  className="text-primary hover:text-primary-glow transition-colors"
                >
                  privacy@bukr.app
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-3 logo">7. Changes to This Policy</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                We may update this privacy policy periodically. Changes will be posted on this page with an updated 
                "Last Updated" date.
              </p>
            </section>

            <div className="pt-4 text-sm text-muted-foreground">
              Last Updated: July 29, 2025
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;