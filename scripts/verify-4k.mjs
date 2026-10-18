// Real-device 4K output benchmark at every supported internal render scale.
// Dimensions are asserted by profile-renderer before accepting any case.
process.env.POLYSHADE_VIEWPORT = '3840x2160';
process.env.POLYSHADE_PROFILE_LABEL ??= '4k-current';
process.env.POLYSHADE_CASES ??= 'golden-native,golden-sgsr77,golden-sgsr67,golden-sgsr59,golden-sgsr50';
await import('./profile-renderer.mjs');
