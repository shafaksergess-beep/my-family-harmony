/**
 * Server-side reCAPTCHA v3 verification utilities
 */

/**
 * Verify reCAPTCHA token on the server
 * @param token - The reCAPTCHA token to verify
 * @param expectedAction - The expected action name
 * @param minScore - Minimum score threshold (0.0 to 1.0, default 0.5)
 */
export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string,
  minScore: number = 0.5
): Promise<{ success: boolean; score: number; action: string }> {
  const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");
  if (!secretKey) {
    throw new Error("RECAPTCHA_SECRET_KEY not configured");
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
  const params = new URLSearchParams({
    secret: secretKey,
    response: token,
  });

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      body: params,
    });

    const data = await response.json();

    if (!data.success) {
      console.error("reCAPTCHA verification failed:", data["error-codes"]);
      return { success: false, score: 0, action: "" };
    }

    // Verify action matches
    if (data.action !== expectedAction) {
      console.error(`Action mismatch: expected ${expectedAction}, got ${data.action}`);
      return { success: false, score: data.score, action: data.action };
    }

    // Verify score meets threshold
    if (data.score < minScore) {
      console.error(`Score too low: ${data.score} < ${minScore}`);
      return { success: false, score: data.score, action: data.action };
    }

    console.log(`reCAPTCHA verified: score=${data.score}, action=${data.action}`);
    return { success: true, score: data.score, action: data.action };
  } catch (error) {
    console.error("Error verifying reCAPTCHA token:", error);
    throw error;
  }
}
