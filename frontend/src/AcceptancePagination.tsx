import { ChevronLeft, ChevronRight } from "lucide-react";

export function AcceptancePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1
  );

  return (
    <nav className="acceptance-pagination" aria-label="Navigasi halaman">
      <span className="acceptance-pagination-summary">
        Menampilkan <strong>{firstItem}-{lastItem}</strong> dari <strong>{totalItems}</strong> data
      </span>
      <div className="acceptance-pagination-controls">
        <button
          className="button button--secondary button--compact"
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={18} />
          Sebelumnya
        </button>
        <div className="acceptance-page-numbers">
          {pages.map((item, index) => {
            const previous = pages[index - 1];
            return (
              <span key={item} className="acceptance-page-number-wrap">
                {previous && item - previous > 1 && <span className="acceptance-page-ellipsis">…</span>}
                <button
                  className={`acceptance-page-number ${item === page ? "is-active" : ""}`}
                  type="button"
                  aria-current={item === page ? "page" : undefined}
                  aria-label={`Buka halaman ${item}`}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </button>
              </span>
            );
          })}
        </div>
        <button
          className="button button--secondary button--compact"
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
          <ChevronRight size={18} />
        </button>
      </div>
    </nav>
  );
}
