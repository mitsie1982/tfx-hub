const { matchContractors } = require("../match");

describe("Contractor matching", () => {
  const contractors = [
    {
      id: "demo-contractor-1",
      location_lat: -26.0,
      location_lon: 27.9,
      skills: [],
      status: "verified",
      role: "contractor",
    },
    {
      id: "demo-contractor-2",
      location_lat: -26.01,
      location_lon: 27.91,
      skills: [],
      status: "verified",
      role: "contractor",
    },
    {
      id: "demo-contractor-3",
      location_lat: -26.2,
      location_lon: 28.2,
      skills: [],
      status: "verified",
      role: "contractor",
    },
  ];

  it("returns nearest 2 contractors within 3km", async () => {
    const prisma = { profile: { findMany: async () => contractors } };
    const job = { lat: -26.005, lon: 27.905 };
    const result = await matchContractors({ prisma, location: job, radius_meters: 3000, nearest_n: 2 });
    expect(result.map((c) => c.id)).toEqual(["demo-contractor-1", "demo-contractor-2"]);
  });
});
