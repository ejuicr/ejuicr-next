export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <svg
        className="spinner"
        width="65px"
        height="65px"
        viewBox="0 0 66 66"
        xmlns="http://www.w3.org/2000/svg"
        role="status"
        aria-label="Loading"
      >
        <circle
          className="spinner-path"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          cx="33"
          cy="33"
          r="30"
        />
      </svg>
    </div>
  );
}
