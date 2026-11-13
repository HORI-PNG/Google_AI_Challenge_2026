import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Firebase の ID トークンを、Google の公開鍵で確かめる。
// 秘密鍵（サービスアカウント）を使わずに「本当にログインした本人か」を確認できる。

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

export class UnauthorizedError extends Error {
  constructor() {
    super("ログインが確認できませんでした");
    this.name = "UnauthorizedError";
  }
}

/** Authorization: Bearer <ID トークン> を確かめ、ユーザーの uid を返す */
export async function verifyRequestUser(request: Request): Promise<string> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!projectId || !token) {
    throw new UnauthorizedError();
  }

  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new UnauthorizedError();
    }
    return payload.sub;
  } catch {
    throw new UnauthorizedError();
  }
}
