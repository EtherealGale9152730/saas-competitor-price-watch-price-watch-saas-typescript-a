import { decidePrice } from "./price-watch.ts";

const input = { tenantId: "clinic-a", product: "Reporting", targetPrice: 100, competitorDomain: "example.com" };
const review = decidePrice(input, 89, "https://example.com/reporting");
if (review.status !== "review") throw new Error("a lower observed price must enter review");
const hold = decidePrice(input, 100, "https://example.com/reporting");
if (hold.status !== "hold") throw new Error("the target price must remain on hold");
console.log("price decision test passed");
