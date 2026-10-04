import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";

export default async function UpdatePasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <UpdatePasswordForm token={token} />;
}
