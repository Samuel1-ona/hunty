import { Button } from "@hunty/ui";

interface HuntPaginationProps {
  currentPage: number;
  totalPages: number;
  filteredCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function HuntPagination({
  currentPage,
  totalPages,
  filteredCount,
  pageSize,
  onPageChange,
}: HuntPaginationProps) {
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (pageNumber) =>
      pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1
  );

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {filteredCount <= pageSize
          ? "Everything fits on one page."
          : `Browsing ${filteredCount} hunts in pages of ${pageSize}.`}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>

        {pageNumbers.map((pageNumber, index) => {
          const previousPage = pageNumbers[index - 1];
          const shouldShowGap = typeof previousPage === "number" && pageNumber - previousPage > 1;

          return (
            <div key={pageNumber} className="flex items-center gap-2">
              {shouldShowGap && <span className="px-1 text-sm text-slate-400">…</span>}
              <Button
                type="button"
                size="sm"
                variant={pageNumber === currentPage ? "default" : "outline"}
                onClick={() => onPageChange(pageNumber)}
                className={
                  pageNumber === currentPage
                    ? "min-w-9 bg-[#3737A4] text-white hover:bg-[#2d2d8d]"
                    : "min-w-9"
                }
              >
                {pageNumber}
              </Button>
            </div>
          );
        })}

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
