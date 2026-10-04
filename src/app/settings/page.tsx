import SettingsForm from "@/components/settings/SettingsForm";
import RequireAuth from "@/components/ui/RequireAuth";

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsForm />
    </RequireAuth>
  );
}
