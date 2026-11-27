import assert from "node:assert/strict";
import test from "node:test";
import { isSafeApplyUrl, normalizeGreenhouse, normalizeLever, searchListings } from "../src/lib/job-boards";

test("normalizes Greenhouse jobs and strips encoded markup", () => {
  const jobs = normalizeGreenhouse({
    jobs: [
      {
        id: 42,
        title: "Product Designer",
        location: { name: "Remote, US" },
        content: "&amp;lt;p&amp;gt;Lead product discovery&amp;lt;/p&amp;gt;",
        updated_at: "2026-01-03T00:00:00Z",
      },
    ],
  });

  assert.deepEqual(jobs, [
    {
      id: "42",
      title: "Product Designer",
      location: "Remote, US",
      description: "Lead product discovery",
      applyUrl: "",
      updatedAt: "2026-01-03T00:00:00Z",
    },
  ]);
});

test("normalizes Lever jobs and rejects unsafe employer URLs", () => {
  const jobs = normalizeLever([
    {
      id: "posting-id",
      text: "Senior Engineer",
      descriptionPlain: "Build reliable services",
      categories: { location: "New York" },
      urls: { apply: "https://jobs.lever.co/acme/posting-id/apply" },
      createdAt: 1760000000000,
    },
  ]);

  assert.equal(jobs[0].title, "Senior Engineer");
  assert.equal(jobs[0].description, "Build reliable services");
  assert.equal(isSafeApplyUrl("LEVER", jobs[0].applyUrl), true);
  assert.equal(isSafeApplyUrl("LEVER", "https://jobs.lever.co.attacker.example/acme/posting-id"), false);
  assert.equal(isSafeApplyUrl("GREENHOUSE", "http://boards.greenhouse.io/acme/jobs/42"), false);
});

test("filters real listings by role text and location", () => {
  const jobs = [
    { id: "1", title: "Product Designer", location: "Remote, US", description: "Design systems", applyUrl: "", updatedAt: null, provider: "GREENHOUSE" as const, boardId: "a", companyName: "Acme" },
    { id: "2", title: "Product Engineer", location: "London", description: "Frontend systems", applyUrl: "", updatedAt: null, provider: "LEVER" as const, boardId: "b", companyName: "Other" },
  ];

  assert.deepEqual(searchListings(jobs, "designer", "remote").map((job) => job.id), ["1"]);
  assert.deepEqual(searchListings(jobs, "product", "london").map((job) => job.id), ["2"]);
  assert.equal(searchListings(jobs, "", "").length, 2);
});
