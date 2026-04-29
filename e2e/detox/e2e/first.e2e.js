describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('shows welcome screen', async () => {
    await expect(element(by.text('TFX Hub AMS (Example)'))).toBeVisible();
  });
});
