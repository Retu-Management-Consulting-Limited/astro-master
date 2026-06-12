export function CosmicEye() {
  return (
    <div style={{ position: "relative", width: 300, height: 190 }}>
      <div className="eye-glow" />
      <div className="eyeclip">
        <div className="sclera" />
        <div className="cosmic">
          <div className="neb" />
          <div className="ring" />
          <div className="mist" />
          <div className="pup" />
        </div>
      </div>
      <svg className="lids" viewBox="0 0 300 190">
        <path d="M26 95 Q150 6 274 95" fill="none" stroke="#c9a861" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M26 95 Q150 184 274 95" fill="none" stroke="#c9a861" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 80 Q150 24 260 80" fill="none" stroke="#9a7d44" strokeWidth=".8" opacity=".5" />
        <path d="M22 95 L14 92" stroke="#c9a861" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M278 95 L286 92" stroke="#c9a861" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function EyeMini() {
  return <div className="eye-mini" />;
}
