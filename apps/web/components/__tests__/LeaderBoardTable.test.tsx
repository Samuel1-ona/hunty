render(<LeaderboardTable data={[]} isLoading={false} />)

// The EmptyState copy in apps/web/components/LeaderBoardTable.tsx uses
// title "No results for these filters" rather than the older
// "Be the first to complete" wording this test asserted.
await waitFor(() => {
  expect(screen.getByText(/No results for these filters/i)).toBeInTheDocument();
});expect(screen.getByText(/No results for these filters/i)).toBeInTheDocument();