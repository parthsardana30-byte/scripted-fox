import { describe, expect, it } from "vitest";

import {
  createPayuCommandHash,
  createPayuPaymentHash,
  createPayuResponseHash,
  verifyPayuResponseHash,
} from "@/lib/billing/payu-signature";

describe("PayU signatures", () => {
  it("uses PayU's required request-field order", () => {
    expect(createPayuPaymentHash({
      key: "key123",
      transactionId: "txn123",
      amount: "50.00",
      productInfo: "Scripted Fox Plus Monthly",
      firstName: "Parth Sardana",
      email: "parth@example.com",
    }, "salt456")).toBe(
      "826cb991b4f7f112f66faf61993f8c668448f94b71bdfc45b77bf30e39854fbf67698ab15eb0e868ed6552ad066679ff4f90759a06921590b4b819eff1e68692",
    );
  });

  it("validates PayU's reverse response signature", () => {
    const response = {
      key: "key123",
      txnid: "txn123",
      amount: "50.00",
      productinfo: "Scripted Fox Plus Monthly",
      firstname: "Parth Sardana",
      email: "parth@example.com",
      status: "success",
      hash: "45a80bbec1d3479ddec522c1387c6417785575995a25b418fd07c6a3c63027bc761b0cbce6c329431db41169c7ffbe93590cd925d75076695866058d543a042c",
    };
    expect(createPayuResponseHash(response, "salt456")).toBe(response.hash);
    expect(verifyPayuResponseHash(response, "salt456")).toBe(true);
    expect(verifyPayuResponseHash({ ...response, amount: "150.00" }, "salt456")).toBe(false);
  });

  it("signs command APIs independently from payment requests", () => {
    expect(createPayuCommandHash("key123", "verify_payment", "txn123", "salt456")).toHaveLength(128);
  });
});
