import { createSignerClient } from "@slicekit/erc8128";
import { createHash, randomUUID } from "node:crypto";
import { computeAddress, getAddress, hashMessage, SigningKey } from "ethers";
import { gossipV2AuthHeaders, gossipV2AuthMessage } from "./http-auth-v2.js";

export interface IdentitySigner {
  readonly address: string;
  signMessage(message: string | Uint8Array): Promise<string>;
}

export interface Connection {
  endpoint: string;
  audience: string;
  profile?: "sherwood-eip191-personal-sign-v1" | "erc8128";
  chainId?: number;
}

function canonicalHttpsUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a canonical HTTPS URL.`);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.href !== value ||
    /[\s\u0000-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new Error(`${label} must be a canonical HTTPS URL.`);
  }
  return url;
}

export function createV2SignedFetch(
  wallet: IdentitySigner,
  connection: Pick<Connection, "endpoint" | "audience">,
  send: typeof fetch = fetch,
): typeof fetch {
  const endpoint = canonicalHttpsUrl(connection.endpoint, "Endpoint");
  const audience = canonicalHttpsUrl(connection.audience, "Audience");

  return async (input, init) => {
    const request = new Request(input, { ...init, redirect: "error" });
    if (request.url !== endpoint.href) {
      throw new Error(
        "Signing destination does not match the configured MCP endpoint.",
      );
    }
    if (
      [...request.headers.keys()].some((name) => {
        const normalized = name.toLowerCase();
        return (
          normalized === "authorization" ||
          normalized.startsWith("x-gossip-") ||
          normalized.startsWith("x-sherwood-")
        );
      })
    ) {
      throw new Error("Caller-supplied authentication headers are forbidden.");
    }

    const body = new Uint8Array(await request.clone().arrayBuffer());
    const nonce = randomUUID();
    const expires = String(Math.floor(Date.now() / 1000) + 240);
    const target = endpoint.pathname + endpoint.search;
    const message = gossipV2AuthMessage({
      audience: audience.href,
      endpoint: endpoint.href,
      method: request.method,
      target,
      body,
      nonce,
      expires,
    });
    const proof = await checkedSignature(wallet, message);
    const headers = gossipV2AuthHeaders({
      publicKey: proof.publicKey,
      signature: proof.signature,
      nonce,
      expires,
    });
    for (const [name, value] of Object.entries(headers)) {
      request.headers.set(name, value);
    }
    return send(request);
  };
}

export function createSignedFetch(
  wallet: IdentitySigner,
  connection: Connection,
  send: typeof fetch = fetch,
): typeof fetch {
  const endpoint = new URL(connection.endpoint);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.hash
  ) {
    throw new Error(
      "The endpoint must be HTTPS without credentials or a fragment.",
    );
  }
  const audience = new URL(connection.audience);
  if (
    audience.protocol !== "https:" ||
    audience.username ||
    audience.password ||
    audience.hash ||
    /[\r\n]/.test(connection.audience)
  ) {
    throw new Error("Invalid HTTPS audience.");
  }
  if (
    connection.profile &&
    !["sherwood-eip191-personal-sign-v1", "erc8128"].includes(
      connection.profile,
    )
  ) {
    throw new Error("Unsupported signing profile.");
  }
  if (
    connection.profile === "erc8128" &&
    (!Number.isSafeInteger(connection.chainId) || connection.chainId! <= 0)
  ) {
    throw new Error("ERC-8128 requires an explicit positive chain ID.");
  }
  return async (input, init) => {
    const request = new Request(input, { ...init, redirect: "error" });
    if (request.url !== endpoint.href)
      throw new Error(
        "Signing destination does not match the configured MCP endpoint.",
      );
    const body = new Uint8Array(await request.clone().arrayBuffer());
    if (body.length > 64 * 1024) throw new Error("Request exceeds 64 KiB.");
    if (connection.profile === "erc8128") {
      const signer = createSignerClient({
        address: wallet.address as `0x${string}`,
        chainId: connection.chainId!,
        signMessage: async (message: Uint8Array) =>
          (await checkedSignature(wallet, message)).signature as `0x${string}`,
      });
      const signed = await signer.signRequest(request);
      return send(new Request(signed, { redirect: "error" }));
    }
    const nonce = randomUUID();
    const expires = String(Math.floor(Date.now() / 1000) + 240);
    const url = new URL(request.url);
    const message = [
      "Sherwood request v1",
      connection.audience,
      request.method.toUpperCase(),
      url.pathname + url.search,
      createHash("sha256").update(body).digest("hex"),
      nonce,
      expires,
    ].join("\n");
    const proof = await checkedSignature(wallet, message);
    request.headers.set("X-Sherwood-Public-Key", proof.publicKey);
    request.headers.set("X-Sherwood-Signature", proof.signature);
    request.headers.set("X-Sherwood-Nonce", nonce);
    request.headers.set("X-Sherwood-Expires", expires);
    return send(request);
  };
}

async function checkedSignature(
  wallet: IdentitySigner,
  message: string | Uint8Array,
) {
  const signature = await wallet.signMessage(message);
  const publicKey = SigningKey.recoverPublicKey(
    hashMessage(message),
    signature,
  );
  if (getAddress(computeAddress(publicKey)) !== getAddress(wallet.address)) {
    throw new Error("Signer returned a proof for a different identity.");
  }
  return { signature, publicKey };
}
