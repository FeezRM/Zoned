import { DashboardLayout } from "@/components/DashboardLayout";
import OnboardingGate from "@/components/OnboardingGate";

const Index = () => {
  return (
    <OnboardingGate>
      <DashboardLayout />
    </OnboardingGate>
  );
};

export default Index;
