// userEvent.setup() (used in renderHeader) installs a clipboard stub of its
// own, so capture the spy BEFORE the per-test user object is created and
// attach it via defineProperty (configurable) so it survives any later
// navigator reassignments. The earlier `Object.assign(navigator, {...vi.fn})`
// form silently lost the spy to userEvent's stub, which made
// `expect(navigator.clipboard.writeText)` fail with
// "[AsyncFunction writeText] is not a spy or a call to a spy!".
const clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: clipboardWriteTextSpy,
  },
});expect(clipboardWriteTextSpy).toHaveBeenCalledWith("GABC123DEF456");