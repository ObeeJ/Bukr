import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <AnimatedLogo size="md" />
        </div>

        <div className="glass-card p-8">
          <h1 className="text-3xl font-bold text-glow mb-8">Privacy Policy</h1>
          
          <div className="space-y-6 text-foreground">
            <section>
              <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                Welcome to Bukr. We respect your privacy and are committed to protecting your personal data. 
                This privacy policy will inform you about how we look after your personal data when you visit 
                our website and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">2. Data We Collect</h2>
              <p className="text-muted-foreground mb-3">
                We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Identity Data: name, username, or similar identifier</li>
                <li>Contact Data: email address, phone number</li>
                <li>Technical Data: internet protocol address, login data, browser type</li>
                <li>Profile Data: your preferences, feedback, and survey responses</li>
                <li>Usage Data: information about how you use our website and services</li>
                <li>Marketing Data: your preferences in receiving marketing from us</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">3. How We Use Your Data</h2>
              <p className="text-muted-foreground mb-3">
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To register you as a new customer</li>
                <li>To process and deliver your orders</li>
                <li>To manage our relationship with you</li>
                <li>To improve our website, products/services, marketing</li>
                <li>To recommend products or services that may interest you</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">4. Data Security</h2>
              <p className="text-muted-foreground">
                We have put in place appropriate security measures to prevent your personal data from being 
                accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. We limit 
                access to your personal data to those employees, agents, contractors, and other third parties 
                who have a business need to know.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">5. Your Legal Rights</h2>
              <p className="text-muted-foreground mb-3">
                Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Request access to your personal data</li>
                <li>Request correction of your personal data</li>
                <li>Request erasure of your personal data</li>
                <li>Object to processing of your personal data</li>
                <li>Request restriction of processing your personal data</li>
                <li>Request transfer of your personal data</li>
                <li>Right to withdraw consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">6. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
                <br />
                <a href="mailto:privacy@bukr.app" className="text-primary hover:text-primary-glow transition-colors">
                  privacy@bukr.app
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">7. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update our privacy policy from time to time. We will notify you of any changes by posting 
                the new privacy policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <div className="pt-4 text-sm text-muted-foreground">
              Last Updated: June 15, 2025
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;