// The responsive layout is on the inner content row, not the outer
// padding wrapper (`mx-auto max-w-[1600px] ...`). The inner row
// switches to `sm:flex-row` from `flex-col` at the sm breakpoint.
const innerRow = document.querySelector("footer .flex.flex-col");
expect(innerRow?.className).toContain("sm:flex-row");
expect(innerRow?.className).toContain("flex-col");