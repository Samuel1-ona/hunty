const GradientCheckIcon = ({ size = 24 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#787884" />
          <stop offset="100%" stopColor="#576065" />
        </linearGradient>
      </defs>
      <path
        d="M5 13l4 4L19 7"
        stroke="url(#checkGradient)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  
  export default GradientCheckIcon;
  