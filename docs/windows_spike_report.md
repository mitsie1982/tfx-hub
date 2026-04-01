# Windows Support Spike Report

Generated: 20260401T081833Z

## Objective
Evaluate feasibility, effort, and tradeoffs to support Windows for TFX Hub mobile apps.

## Scope
- React Native + react-native-windows (RNW)
- Flutter (Windows desktop)

## Success criteria (measureable)
- Build: ability to produce a working debug build on Windows.
- UI parity: ability to implement required screens with native look/feel.
- Native modules: availability or effort to port critical native modules.
- Packaging: ability to produce distributable MSIX/MSIXBUNDLE or AppX.
- CI: feasibility of automating Windows builds in CI (self-hosted vs hosted).
- Developer experience: time to onboard and iterate.

## Test checklist
- [ ] Initialize sample app (RNW) and run on Windows emulator or device.
- [ ] Initialize Flutter sample and run on Windows.
- [ ] Implement one representative screen from AMS (data table / list).
- [ ] Validate push notifications or equivalent (if required).
- [ ] Validate native module compatibility (e.g., file system, camera).
- [ ] Produce a release artifact (MSIX) or document blockers.
- [ ] Document build time, dev setup time, and any Visual Studio requirements.

## Findings (fill during spike)
- RNW: 
  - Build success: 
  - Key blockers:
  - Native modules compatibility:
  - Packaging notes:
  - Estimated effort to productionize:

- Flutter:
  - Build success:
  - Key blockers:
  - Plugin availability:
  - Packaging notes:
  - Estimated effort to productionize:

## Recommendation
(Choose RNW or Flutter or hybrid approach; include rationale and estimated migration cost)

