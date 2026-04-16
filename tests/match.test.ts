import { matchProfessionals, Professional } from "../src/match";

describe("matchProfessionals", () => {
  it("returns professionals within radius", () => {
    const professionals: Professional[] = [
      { id: 1, name: "A", lat: 0, lon: 0 },
      { id: 2, name: "B", lat: 0.1, lon: 0.1 },
      { id: 3, name: "C", lat: 10, lon: 10 },
    ];
    const location = { lat: 0, lon: 0 };
    const matches = matchProfessionals(professionals, location, 20);
    expect(matches.length).toBe(2);
  });
});
