import { createHash, timingSafeEqual } from "node:crypto";

type PayuRequestSignatureInput = {
  key: string;
  transactionId: string;
  amount: string;
  productInfo: string;
  firstName: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
};

export type PayuResponseSignatureInput = {
  key?: string;
  txnid?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  status?: string;
  hash?: string;
  additional_charges?: string;
  additionalCharges?: string;
  splitInfo?: string;
};

function sha512(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

export function createPayuPaymentHash(input: PayuRequestSignatureInput, salt: string) {
  return sha512([
    input.key,
    input.transactionId,
    input.amount,
    input.productInfo,
    input.firstName,
    input.email,
    input.udf1 ?? "",
    input.udf2 ?? "",
    input.udf3 ?? "",
    input.udf4 ?? "",
    input.udf5 ?? "",
    "",
    "",
    "",
    "",
    "",
    salt,
  ].join("|"));
}

export function createPayuResponseHash(input: PayuResponseSignatureInput, salt: string) {
  const parts = [
    salt,
    input.status ?? "",
    ...(input.splitInfo ? [input.splitInfo] : []),
    "",
    "",
    "",
    "",
    "",
    input.udf5 ?? "",
    input.udf4 ?? "",
    input.udf3 ?? "",
    input.udf2 ?? "",
    input.udf1 ?? "",
    input.email ?? "",
    input.firstname ?? "",
    input.productinfo ?? "",
    input.amount ?? "",
    input.txnid ?? "",
    input.key ?? "",
  ];
  const hashInput = parts.join("|");
  const additionalCharges = input.additional_charges ?? input.additionalCharges;
  return sha512(additionalCharges ? additionalCharges + "|" + hashInput : hashInput);
}

export function verifyPayuResponseHash(input: PayuResponseSignatureInput, salt: string) {
  if (!input.hash) return false;
  const received = Buffer.from(input.hash.toLowerCase(), "utf8");
  const expected = Buffer.from(createPayuResponseHash(input, salt), "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function createPayuCommandHash(key: string, command: string, value: string, salt: string) {
  return sha512([key, command, value, salt].join("|"));
}
