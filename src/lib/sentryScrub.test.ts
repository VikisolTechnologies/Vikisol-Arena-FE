import assert from "node:assert/strict";
import test from "node:test";
import { scrubSentryEvent } from "./sentryScrub";

test("strips cookies, auth headers, and the request body", () => {
  const event = scrubSentryEvent({
    request: {
      cookies: "session=abc",
      data: "password=secret",
      headers: {
        Authorization: "Bearer token",
        Cookie: "session=abc",
        Accept: "application/json",
      },
    },
  });
  assert.equal(event.request?.cookies, undefined);
  assert.equal(event.request?.data, undefined);
  assert.equal(event.request?.headers?.Authorization, undefined);
  assert.equal(event.request?.headers?.Cookie, undefined);
  assert.equal(event.request?.headers?.Accept, "application/json");
});
