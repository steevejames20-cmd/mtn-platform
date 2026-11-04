/** Illustration vectorielle : antenne relais + smartphone connecté */
export default function HeroArt({ variant = 'hero' }) {
  return (
    <svg className={`hero-art hero-art-${variant}`} viewBox="0 0 420 380" role="img" aria-label="Smartphone connecté à une antenne relais">
      <defs>
        <linearGradient id="screen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8d6" />
          <stop offset="1" stopColor="#ffe680" />
        </linearGradient>
      </defs>
      <circle cx="230" cy="200" r="165" fill="#ffcc00" />
      <circle cx="230" cy="200" r="165" fill="none" stroke="#111" strokeOpacity=".06" strokeWidth="30" />

      {/* antenne relais */}
      <g stroke="#1f1f1f" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M330 340 L352 110 L374 340" />
        <path d="M336 290 L368 290 M339 240 L365 240 M343 190 L361 190 M347 145 L357 145" />
        <path d="M336 290 L365 240 L343 190 L357 145 M368 290 L339 240 L361 190 L347 145" strokeWidth="2.5" />
        <rect x="343" y="96" width="18" height="16" rx="2" fill="#1f1f1f" />
      </g>
      <g stroke="#1f1f1f" strokeWidth="4" strokeLinecap="round" fill="none" className="waves">
        <path d="M322 82 a40 40 0 0 1 60 0" />
        <path d="M308 66 a60 60 0 0 1 88 0" opacity=".6" />
        <path d="M294 50 a80 80 0 0 1 116 0" opacity=".3" />
      </g>

      {/* smartphone */}
      <g transform="translate(120 70) rotate(-8)">
        <rect x="0" y="0" width="150" height="270" rx="24" fill="#111" />
        <rect x="9" y="12" width="132" height="246" rx="16" fill="url(#screen)" />
        <rect x="55" y="18" width="40" height="7" rx="3.5" fill="#111" />
        <g fill="#111">
          <rect x="22" y="44" width="70" height="10" rx="5" />
          <rect x="22" y="62" width="104" height="7" rx="3.5" opacity=".35" />
        </g>
        <rect x="22" y="86" width="106" height="74" rx="12" fill="#fff" />
        <text x="75" y="120" textAnchor="middle" fontFamily="Poppins, Arial" fontWeight="800" fontSize="26" fill="#111">10 Go</text>
        <text x="75" y="142" textAnchor="middle" fontFamily="Poppins, Arial" fontSize="11" fill="#555">30 jours</text>
        <rect x="22" y="174" width="106" height="30" rx="15" fill="#ffcc00" stroke="#111" strokeWidth="2" />
        <text x="75" y="194" textAnchor="middle" fontFamily="Poppins, Arial" fontWeight="700" fontSize="12" fill="#111">Souscrire</text>
        <g transform="translate(57 216)">
          <circle cx="18" cy="18" r="16" fill="#1aa260" />
          <path d="M10 18 l6 6 l11 -12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* bulles décoratives */}
      <g className="float-a">
        <rect x="28" y="120" width="96" height="44" rx="14" fill="#fff" stroke="#111" strokeWidth="2" />
        <text x="76" y="140" textAnchor="middle" fontFamily="Poppins, Arial" fontSize="10" fill="#666">Débit</text>
        <text x="76" y="156" textAnchor="middle" fontFamily="Poppins, Arial" fontWeight="800" fontSize="13" fill="#111">Ultra rapide</text>
      </g>
      <g className="float-b">
        <rect x="40" y="270" width="104" height="44" rx="14" fill="#111" />
        <text x="92" y="290" textAnchor="middle" fontFamily="Poppins, Arial" fontSize="10" fill="#ffcc00">Activation</text>
        <text x="92" y="306" textAnchor="middle" fontFamily="Poppins, Arial" fontWeight="800" fontSize="13" fill="#fff">Immédiate</text>
      </g>
    </svg>
  );
}
