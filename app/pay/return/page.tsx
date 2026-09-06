import Link from "next/link";

export default function PayReturnPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Checking payment</h1>
      <p>
        We are confirming the payment with the provider. A redirect does not mean the
        payment succeeded.
      </p>
      <Link href="/pay" className="underline">
        View current status
      </Link>
    </div>
  );
}
