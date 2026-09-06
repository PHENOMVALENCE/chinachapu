import { sweepPayments } from "../lib/server/payments/webhooks";

async function main() {
  await sweepPayments();
  console.log("Payment inbox and unresolved attempts swept.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
