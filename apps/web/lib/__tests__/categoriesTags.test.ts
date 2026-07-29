it("autocompletes from corpus", () => {
  // Prefix matches come first. For query "mur" the corpus "mural" is the
  // only prefix hit ("museum" is m-u-s-e-u-m so it does not contain
  // "mur"). "park" matches neither.
  expect(autocompleteTags("mur", ["mural", "museum", "park"])).toEqual(
    expect.arrayContaining(["mural"]),
  )
})