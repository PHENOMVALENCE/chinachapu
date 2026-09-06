export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { isHostedRuntime, getConfig } = await import("./lib/server/config");
  if (isHostedRuntime()) {
    getConfig();
  }
}
