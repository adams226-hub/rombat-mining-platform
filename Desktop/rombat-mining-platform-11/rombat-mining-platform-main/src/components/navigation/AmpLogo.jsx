import React from 'react';

// Reproduction fidèle du logo AMP - African Mining Partenair SARL
// Carré orange avec carte Afrique en pointillés + texte AMP
export default function AmpLogo({ collapsed = false }) {
  // Grille de points formant le continent africain (8 colonnes x 10 lignes)
  // 1 = point visible (continent), 0 = vide
  const africaGrid = [
    [0,0,1,1,1,0,0,0],
    [0,1,1,1,1,1,0,0],
    [1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,0],
    [0,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,1,0,0,0,0],
  ];

  const dotR = 2.8;
  const spacing = 6.2;
  const offsetX = 6;
  const offsetY = 5;

  const dots = [];
  africaGrid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell) {
        dots.push(
          <circle
            key={`${ri}-${ci}`}
            cx={offsetX + ci * spacing}
            cy={offsetY + ri * spacing}
            r={dotR}
            fill="#2A1A0E"
            opacity="0.75"
          />
        );
      }
    });
  });

  if (collapsed) {
    // Mode réduit : uniquement le carré orange avec les points
    return (
      <svg width="40" height="40" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="66" height="66" rx="8" fill="#D04B1A"/>
        {dots}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 230 66"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '52px', display: 'block' }}
    >
      {/* Carré orange */}
      <rect x="0" y="0" width="66" height="66" rx="6" fill="#D04B1A"/>

      {/* Points Afrique */}
      {dots}

      {/* AMP - texte principal */}
      <text
        x="74"
        y="42"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="36"
        fill="#FFFFFF"
        letterSpacing="1"
      >
        AMP
      </text>

      {/* Ligne 1 : African Mining Partenair */}
      <text
        x="75"
        y="57"
        fontFamily="Arial, sans-serif"
        fontWeight="400"
        fontSize="9.5"
        fill="rgba(255,255,255,0.80)"
        letterSpacing="0.3"
      >
        African Mining Partenair
      </text>

      {/* SARL en orange */}
      <text
        x="75"
        y="68"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
        fontSize="9.5"
        fill="#FFA040"
        letterSpacing="1"
      >
        SARL
      </text>
    </svg>
  );
}
