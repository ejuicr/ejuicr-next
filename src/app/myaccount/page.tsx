import MyAccount from "@/components/account/MyAccount";
import RequireAuth from "@/components/ui/RequireAuth";

export default function MyAccountPage() {
  return (
    <RequireAuth>
      <MyAccount />
    </RequireAuth>
  );
}
